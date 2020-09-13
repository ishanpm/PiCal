(function(){
// Get syntax tree from program code
function parse(program) {
  let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
  parser.feed(program);
  return parser.results[0];
}

function compile(program) {
  return postprocess(parse(program));
}

// Postprocess program
// Intermediate representation uses RPN-style stack,
// arguments are pushed LTR
function postprocess(program) {
  let result = [];
  
  // Add an LValue (a name which can be assigned to) to the result
  function processLval(input, result) {
    result.push("&");
    result.push(input);
  }
  
  // Add an RValue (an expression which can be read from) to the result
  function processRval(input, result) {
    if (input === null || typeof(input) == "number" || typeof(input) == "string") {
      result.push("=");
      result.push(input);
    } else if (input[0] == "[") {
      // Expression shorthand
      processSequence(input[2], result)
      processRval(input[1], result)
    } else if (input[0] == "[[") {
      // Unevaluated expression shorthand
      let sig = input[1];
      let selfName = sig[0] // ? sig[0][0] : null
      let ioName   = sig[1] // ? sig[1][0] : null
      let subprogram = []
      
      processLval(selfName, subprogram)
      processLval(ioName, subprogram)
      
      subprogram.push("[[*") //, sig[0] != null, input[1] != null)
      
      for (let subinp of sig[2]) {
        processLval(subinp, subprogram)
        subprogram.push("{+")
      }
      
      processSequence(input[2], subprogram);
      
      for (let subout of sig[3]) {
        processRval(subout, subprogram)
        subprogram.push("{-")
      }
      
      subprogram.push("}")
      
      result.push("[[");
      result.push(subprogram);
    }
  }
  
  // Add an instruction and its arguments to the result
  function processInstruction(expr, result) {
    if (expr[0] == "+" || expr[0] == "!" || expr[0] == "*:") {
      // Read, replicated read, new, alias
      processLval(expr[1], result);
      processRval(expr[2], result);
      result.push(expr[0]);
    } else if (expr[0] == "-") {
      // Write
      processRval(expr[1], result);
      processRval(expr[2], result);
      result.push(expr[0]);
    } else if (expr[0] == "*") {
      // New
      processLval(expr[1], result);
      result.push(expr[0]);
    } else if (expr[0] == "(") {
      // Branch
      result.push(expr[0]);
      let subprogram = [];
      processSequence(expr[1], subprogram)
      result.push(subprogram);
    } else if (expr[0] == "{") {
      // Function shorthand
      let createNewIO = expr[1][0]
      let ioName      = expr[1][1]
      let funcName    = expr[1][2]
      
      if (createNewIO) {
        processLval(ioName, result)
      } else {
        processRval(ioName, result)
      }
      processRval(funcName, result)
      result.push("{", createNewIO);
      
      for (let a of expr[2]) {
        if (a[0] == "+") {
          processLval(a[1], result)
          result.push("{+")
        } else if (a[0] == "-") {
          processRval(a[1], result)
          result.push("{-")
        }
      }
      result.push("}");
    } else if (expr[0] == "<") {
      result.push(expr[0], expr[1])
    }
  }
  
  // Add an entire program to the result
  function processSequence(seq, result) {
    for (let i of seq) {
      processInstruction(i, result);
    }
  }
  
  processSequence(program, result);
  
  return result;
}

// Copy all enumerable own properties from source to new object
function copyObj(source) {
  return Object.assign({},source);
}

class AbstractChannel {
  constructor(root) {
    this.root = root;
    this.refCount = 0;
    
    this.closed = false;
    
    root.channels.push(this);
  }
  
  addRef(obj) {
    this.refCount++;
    
    if (this.refCount > 0) this.closed = false;
  }
  
  removeRef(obj) {
    this.refCount--;
    
    if (this.refCount == 0) this.closed = true;
  }
  
  read(reader) {
    throw new TypeError("Can't read from channel");
  }
  
  write(val, writer) {
    throw new TypeError("Can't write to channel");
  }
  
  toString() {
    if (this.val) {
      return `Channel(${this.val})`
    } else {
      return `Channel`
    }
  }
}

class ConstantChannel extends AbstractChannel {
  constructor(root, val) {
    super(root);
    this.val = val;
  }
}

class FunctionChannel extends AbstractChannel {
  constructor(root, callback) {
    super(root);
    this.arity = callback.length;
    this.callback = callback;
  }
  
  write(io, writer) {
    let that = this;
    let arity = this.arity;
    let callback = this.callback;
    
    let readHandler = {args: [], onRead: function(arg) {
      this.args.push(arg);
      arg.addRef(that);
      
      if (this.args.length == arity) {
        io.write(callback.apply(null, this.args), readHandler)
      } else {
        io.read(readHandler)
      }
    }, onWrite: function() {
      for (let a of this.args) a.removeRef(that);
    }}
    io.read(readHandler);
    
    writer.onWrite();
  }
}

class Channel extends AbstractChannel {
  constructor(root) {
    super(root);
    this.reads = [];
    this.writeVals = [];
    this.writes = [];
  }
  
  read(reader) {
    if (this.writes.length > 0) {
      this.addRef();
      
      let writer = this.writes.pop();
      let val = this.writeVals.pop();
      
      reader.onRead(val);
      writer.onWrite();
      
      if (reader.infinite) {
        this.read(reader);
      }
    } else {
      this.removeRef();
      this.reads.push(reader);
    }
  }
  
  write(val, writer) {
    if (this.reads.length > 0) {
      this.addRef();
      let reader = this.reads.pop();
      
      reader.onRead(val);
      writer.onWrite();
      
      if (reader.infinite) {
        this.read(reader);
      }
    } else {
      this.removeRef();
      this.writes.push(writer);
      this.writeVals.push(val);
    }
  }
}

class Evaluator {
  constructor(root,program,index) {
    this.root = root;
    this.program = program;
    this.index = index || 0;
    this.name = "0";
    this.vars = [];
    this.names = {};
    this.stack = [];
    this.childCount = 0;
    this.cloneCount = 0;
    
    this.blocking = null;
    this.blockType = null;
    this.error = null;
    this.halt = false;
    
    root.evaluators.push(this);
  }
  
  clone() {
    let other = new Evaluator(this.root,this.program,this.index);
    other.name = `${this.name}:${this.cloneCount}`
    
    other.vars = this.vars.map(e => ((e.addRef(this)),e));
    other.names = copyObj(this.names);
    other.stack = this.stack.map(e => ((e&&e.addRef ? e.addRef(this) : null),e));
    
    other.blocking = this.blocking;
    other.blockType = this.blockType;
    other.error = this.error;
    other.halt = this.halt;
    
    this.cloneCount++
    
    return other;
  }
  
  makeChild(program, index) {
    let other = new Evaluator(this.root,program,index);
    other.name = `${this.name}.${this.childCount}`
    
    other.vars = this.vars.map(e => ((e.addRef(this)),e));
    other.names = copyObj(this.names);
    
    this.childCount++;
    
    return other;
  }
  
  run() {
    while (!(this.blocking || this.halt)) this.step();
  }
  
  step() {
    if (!this.blocking && this.index >= this.program.length) this.halt = true;
    
    if (this.halt) {
      if (this.root) {
        this.root.cullEvaluator(this)
      }
      return this.halt;
    }
    
    if (this.blocking) {
      if (this.blocking.closed) {
        this.halt = true
      }
      return this.blockType;
    }
    
    let instr = this.getNext();
    
    switch (instr) {
      case "=": // Reference
        this.push(this.getVar(this.getNext())); break;
      case "&": // Literal
        this.push(this.getNext()); break;
      case "+":
        this.i_read         (this.pop(),this.pop()); break;
      case "!":
        this.i_repRead      (this.peek(0),this.peek(1)); break;
      case "-":
        this.i_write        (this.pop(),this.pop()); break;
      case "*":
        this.i_newChannel   (this.pop()); break;
      case "*:":
        this.i_alias        (this.pop(),this.pop()); break;
      case "(":
        this.i_branch       (this.getNext()); break;
      case "{":
        this.i_enterFunction(this.pop(),this.pop(),this.getNext()); break;
      case "{+":
        this.i_read         (this.peek(1),this.pop()); break;
      case "{-":
        this.i_write        (this.peek(1),this.pop()); break;
      case "}":
        this.i_exitFunction (); break;
      case "[[":
        this.i_enterUneval  (this.getNext()); break;
      case "[[*":
        this.i_beginUneval  (this.pop(),this.pop(),this.pop()/*,this.getNext(), this.getNext()*/); break;
      case "<":
        this.i_systemCall   (this.getNext()); break;
      default:
        this.raiseError(`Unrecognized opcode ${instr}`);
    }
    
    return this.halt || this.blockType;
  }
  
  peek(n) {return this.stack[this.stack.length-1-n]}
  
  pop() {
    let val = this.stack.pop();
    if (val instanceof AbstractChannel) val.removeRef(this);
    return val;
  }
  
  push(val) {
    if (val instanceof AbstractChannel) val.addRef(this);
    this.stack.push(val)
  }
  
  // Return current instruction then increment ip
  getNext() {
    return this.program[this.index++];
  }
  
  // Returns a channel given index or name
  getVar(name) {
    if (typeof(name) == "number") {
      if (name < this.vars.length) {
        // Numbered channel
        return this.vars[this.vars.length-1-name];
        this.raiseError("Can't find numbered channel "+name);
      }
    } else if (typeof(name) == "string") {
      if (this.names[name]) {
        // Named channel
        return this.names[name];
      } else {
        // Special channel
        let spec = this.root.getVar(name);
        if (spec) {
          return spec;
        } else {
          this.raiseError("Can't find named channel "+name);
        }
      }
    } else if (name === null) {
      if (this.vars.length > 0) {
        return this.vars[this.vars.length-1];
      } else {
        this.raiseError("Can't find numbered channel 0");
      }
    }
    
    return null;
  }
  
  addVar(name, value) {
    this.vars.push(value);
    if (name !== null)
      this.names[name] = value;
    value.addRef(this);
  }
  
  // Instructions
  
  i_read(channel, name) {
    if (!this.blocking) {
      this.blocking = channel;
      this.blockType = "read";
      
      let that = this;
      channel.read({onRead: function(value) {
        that.blocking = null;
        that.blockType = null;
        that.addVar(name,value);
      }});
    } else {
      this.raiseError("Attempt to read while already blocked")
    }
  }
  
  i_repRead(channel, name) {
    if (!this.blocking) {
      this.blocking = channel;
      this.blockType = "repread";
      
      let that = this;
      let readHandler = {infinite: true, onRead: function(value) {
        let child = that.clone();
        child.blocking = null;
        child.blockType = null;
        child.addVar(name,value);
      }}
      
      channel.read(readHandler);
    } else {
      this.raiseError("Attempt to rep. read while already blocked")
    }
  }
  
  i_write(channel, value) {
    if (!this.blocking) {
      this.blocking = channel;
      this.blockType = "write";
      
      let that = this;
      channel.write(value, {onWrite: function() {
        that.blocking = null;
        that.blockType = null;
      }});
    }
  }
  
  i_newChannel(name) {
    this.addVar(name, new Channel(this.root));
  }
  
  i_alias(orig, name) {
    this.addVar(name, orig);
  }
  
  i_branch(prog) {
    let child = this.makeChild(prog,0);
  }
  
  i_enterFunction(func, io, createNewIO) {
    let ioChannel;
    if (createNewIO) {
      // io is an lvalue, assign to it
      ioChannel = new Channel(this.root);
      this.addVar(io, ioChannel)
    } else {
      // io is an rvalue, use it
      ioChannel = io;
    }
    this.push(ioChannel);
    
    this.i_write(func, ioChannel)
  }
  
  i_exitFunction() {
    this.pop();
  }
  
  i_enterUneval(prog) {
    let newc = new Channel(this.root);
    let child = this.makeChild(prog,0);
    child.push(newc);
    this.push(newc);
  }
  
  i_beginUneval(ioName, selfName, self/*, showSelf, showIO*/) {
    //if (showSelf) {
    this.addVar(selfName,self);
    // }
    
    if (!this.blocking) {
      this.blocking = self;
      this.blockType = "repread";
      
      let that = this;
      let readHandler = {infinite: true, onRead: function(ioChannel) {
        let child = that.clone();
        child.blocking = null;
        child.blockType = null;
        //if (showIO) {
        child.addVar(ioName,ioChannel);
        // }
        child.push(ioChannel)
      }};
      
      self.read(readHandler);
    } else {
      this.raiseError("Attempt to rep. read while already blocked")
    }
  }
  
  i_syscall(syscall) {
    console.log(syscall)
  }
  
  raiseError(message) {
    console.warn(this)
    console.warn(message)
    this.error = message;
    this.halt = true;
  }
  
  destroy() {
    for (let c of this.vars) {
      c.removeRef(this);
    }
    
    this.vars = [];
  }
  
  toString() {
    return 
  }
}

class MiniPi {
  constructor(program) {
    this.program = program;
    this.channels = [];
    this.evaluators = [];
    this.inQueue = [];
    this.inReads = [];
    this.onOutput = function(val) {};
    this.specialChannels = Object.create(null);
    this.deferChannelCleanup = false;
    
    var that = this;
    
    let inputCh = new AbstractChannel(this);
    inputCh.read = function(reader) {
      if (that.inQueue.length > 0) {
        let val = that.inQueue.shift();
        let ch = new ConstantChannel(that, val);
        reader.onRead(ch);
      } else {
        that.inReads.push(reader);
      }
    }
    this.specialChannels['i'] = inputCh
    
    let outputCh = new AbstractChannel(this);
    outputCh.write = function(val,writer) {
      console.log(val.val);
      that.onOutput(val.val);
      writer.onWrite();
    }
    this.specialChannels['o'] = outputCh
    
    this.specialChannels['plus']  = new FunctionChannel(this, (x,y) => new ConstantChannel(that,x.val+y.val))
    this.specialChannels['minus'] = new FunctionChannel(this, (x,y) => new ConstantChannel(that,x.val-y.val))
    this.specialChannels['times'] = new FunctionChannel(this, (x,y) => new ConstantChannel(that,x.val*y.val))
    this.specialChannels['div']   = new FunctionChannel(this, (x,y) => new ConstantChannel(that,x.val/y.val))
    this.specialChannels['lt']    = new FunctionChannel(this, (x,y) => that.specialChannels[x.val<y.val?'true':'false'])
    this.specialChannels['le']    = new FunctionChannel(this, (x,y) => that.specialChannels[x.val<=y.val?'true':'false'])
    this.specialChannels['gt']    = new FunctionChannel(this, (x,y) => that.specialChannels[x.val>y.val?'true':'false'])
    this.specialChannels['ge']    = new FunctionChannel(this, (x,y) => that.specialChannels[x.val>=y.val?'true':'false'])
    this.specialChannels['eq']    = new FunctionChannel(this, (x,y) => that.specialChannels[x.val==y.val?'true':'false'])
    this.specialChannels['ne']    = new FunctionChannel(this, (x,y) => that.specialChannels[x.val!=y.val?'true':'false'])
    this.specialChannels['true']  = new FunctionChannel(this, (x,y) => x)
    this.specialChannels['true'].val = true
    this.specialChannels['false'] = new FunctionChannel(this, (x,y) => y)
    this.specialChannels['false'].val = false
    
    for (let c in this.specialChannels) {
      this.specialChannels[c].addRef(this);
    }
  }
  
  getVar(name) {
    if (name in this.specialChannels) {
      return this.specialChannels[name];
    } else if (name[0] == "\"" && name[name.length-1] == "\"") {
      let c = new ConstantChannel(this,name.substr(1,name.length-2));
      return c;
    } else if (name[0] == "#") {
      var num = parseFloat(name.substr(1));
      if (!isNaN(num)) {
        return new ConstantChannel(this,num);
      }
    }
  }
  
  pushInput(val) {
    if (this.inReads.length > 0) {
      let reader = this.inReads.pop();
      let ch = new ConstantChannel(this, val);
      reader.onRead(ch);
    } else {
      this.inQueue.push(val);
    }
  }
  
  stepOne() {
    
  }
  
  stepAll() {
    this.deferChannelCleanup = true;
    let oldEvaluators = this.evaluators.map(e=>e)
    
    for (let ev of oldEvaluators) {
      ev.step();
    }
    
    this.cullChannels();
    this.deferChannelCleanup = false;
  }
  
  run() {
    let count = 100;
    
    console.log(`Running ${count} steps`)
    
    for (var i=0; i<count; i++) {
      this.stepAll();
    }
  }
  
  cullChannels() {
    this.channels = this.channels.filter(e => !e.closed)
  }
  
  cullEvaluator(ev) {
    if (ev.error) return;
    
    let i = this.evaluators.indexOf(ev);
    if (i > -1) {
      this.evaluators[i].destroy();
      this.evaluators.splice(i,1);
      
      if (!this.deferChannelCleanup) {
        this.cullChannels();
      }
    }
  }
}

MiniPi.interpret = function(str) {
  let obj = new MiniPi();
  obj.program = compile(str);
  new Evaluator(obj, obj.program);
  return obj;
}

let exports = {parse,postprocess,compile,AbstractChannel,Channel,Evaluator,MiniPi};
window.pilanguage = exports;
})()