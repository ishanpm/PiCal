(function(){
// Get syntax tree from program code
function parse(program) {
  let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
  parser.feed(program);
  return parser.results[0];
}

// Postprocess program
// Intermediate representation has additional
// commands for function and expression shorthand
function postprocess(program) {
  let result = [];
  
  function processInput(input,slot) {
    if ((typeof(input) == "number" || typeof(input) == "string")) {
      return input;
    } else {
      // Expression shorthand
      result.push(["<"]);
      processExpression(input);
      result.push([">",slot]);
      
      return "<"+slot;
    }
  }
  
  function processInstruction(expr) {
    if (expr[0] == "+" || expr[0] == "!") {
      // Read
      let i1 = processInput(expr[1],1);
      result.push([expr[0],i1,expr[2]]);
    } else if (expr[0] == "-") {
      // Write
      let i1 = processInput(expr[1],1);
      let i2 = processInput(expr[2],2);
      result.push([expr[0],i1,i2]);
    } else if (expr[0] == "*") {
      // New channel
      result.push([expr[0],expr[1]]);
    } else if (expr[0] == "(") {
      // Branch
      result.push([expr[0],expr[1]]);
    } else if (expr[0] == "{") {
      // Function shorthand
      let i1 = processInput(expr[1],1);
      result.push(["{",i1]);
      for (let a of expr[2]) {
        if (a[0] == "+") {
          result.push([a[0],"*",a[1]]);
        } else if (a[0] == "-") {
          let a1 = processInput(a[1]);
          result.push([a[0],"*",a1]);
        }
      }
      result.push(["}"]);
    }
  }
  
  function processExpression(expr) {
    for (let i of expr) {
      processInstruction(i);
    }
  }
  
  parsed = parse(program);
  processExpression(parsed);
  
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
  }
  
  removeRef(obj) {
    this.refCount--;
  }
  
  read(rcall) {
    throw new TypeError("Can't read from channel");
  }
  
  write(val, wcall) {
    throw new TypeError("Can't write to channel");
  }
}

class Channel extends AbstractChannel {
  constructor(root) {
    super(root);
    this.reads = [];
    this.writeVals = [];
    this.writes = [];
  }
  
  read(rcall) {
    if (this.writes.length > 0) {
      this.refCount++;
      let wcall = this.writes.pop();
      let val = this.writeVals.pop();
      
      rcall(val);
      wcall();
    } else {
      this.refCount--;
      this.reads.push(rcall);
    }
  }
  
  write(val, wcall) {
    if (this.reads.length > 0) {
      this.refCount++;
      let rcall = this.reads.pop();
      
      rcall(val);
      wcall();
    } else {
      this.refCount--;
      this.writes.push(wcall);
      this.writeVals.pop(val);
    }
  }
}

class VarStore {
  constructor() {
    // Stores vars in the order they were created
    this.vars = [];
    // Map from var name to value
    this.names = Object.create(null);
    this.varFrame = [];
    this.nameStack = [];
  }
  
  clone() {
    // TODO
    let other = new VarStore();
    other.vars = this.vars.map(e => e);
    other.names = copyObj(this.names);
    other.varFrame = this.varFrame.map(e => e);
    other.nameStack = this.nameStack.map(e => e);
  }
}

class Evaluator {
  constructor(root,program,index) {
    this.root = root;
    this.program = program;
    this.index = index || 0;
    this.vars = [];
    this.names = {};
    this.varFrame = [];
    this.nameStack = [];
    
    this.blocking = null;
    this.blockType = null;
    this.error = null;
    this.halt = false;
    
    root.evaluators.push(this);
  }
  
  clone() {
    let other = new Evaluator(this.root,this.program,this.index);
    
    other.vars = this.vars.map(e => e);
    other.names = copyObj(this.names);
    other.varFrame = this.varFrame.map(e => e);
    other.nameStack = this.nameStack.map(e => e);
    
    other.blocking = this.blocking;
    other.blockType = this.blockType;
    other.error = this.error;
    other.halt = this.halt;
    
    for (let c of other.vars) {
      c.addRef(other);
    }
    
    return other;
  }
  
  step() {
    if (this.index >= this.program.length) this.halt = true;
    
    if (this.halt) return true;
    
    let instr = this.program[this.index];
    
    switch (instr[0]) {
      case "+":
        this.i_read(instr[1],instr[2]); break;
      case "!":
        this.i_repRead(instr[1],instr[2]); break;
      case "-":
        this.i_write(instr[1],instr[2]); break;
      case "*":
        this.i_newChannel(instr[1]); break;
      case "(":
        this.i_branch(instr[1]); break;
      case "{":
        this.i_enterFunction(instr[1]); break;
      case "}":
        this.i_exitFunction(); break;
      case "<":
        this.i_enterExpr(); break;
      case ">":
        this.i_exitExpr(instr[1]); break;
      default:
        this.raiseError(`Unrecognized opcode ${instr[1]}`);
    }
    
    return this.halt || this.blockType;
  }
  
  // Returns a channel given index or name
  getVar(name) {
    if (typeof(name) == "number") {
      if (name < this.vars.length) {
        // Numbered channel
        return this.vars[this.vars.length-1-name];
        raiseError("Can't find numbered channel "+name);
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
          raiseError("Can't find named channel "+name);
        }
      }
    } else if (name === null) {
      if (this.vars.length > 0) {
        return this.vars[this.vars.length-1];
      } else {
        raiseError("Can't find numbered channel 0");
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
      channel = this.getVar(channel);
      this.blocking = channel;
      this.blockType = "read";
      
      let that = this;
      channel.read(function(value) {
        that.blocking = null;
        that.blockType = null;
        that.addVar(name,value);
        that.index++;
      });
    }
  }
  
  i_repRead(channel, name) {
    if (!this.blocking) {
      channel = this.getVar(channel);
      this.blocking = channel;
      this.blockType = "read";
      
      let that = this;
      channel.read(function(value) {
        that.blocking = null;
        that.blockType = null;
        let clone = that.clone();
        clone.addVar(name,value);
        clone.index++;
      });
    }
  }
  
  i_write(channel, value) {
    if (!this.blocking) {
      channel = this.getVar(channel);
      value = this.getVar(value);
      this.blocking = channel;
      this.blockType = "write";
      
      let that = this;
      channel.write(value, function() {
        that.blocking = null;
        that.blockType = null;
        that.index++;
      });
    }
  }
  
  i_newChannel(name) {
    let newc = new Channel(this.root);
    this.addVar(name, newc);
    this.index++;
  }
  
  i_branch(prog) {
    let clone = this.clone();
    clone.program = prog;
    clone.index = 0;
    this.index++;
  }
  
  i_enterFunction(channel) {
    let newc = new Channel(this.root);
    this.names["*"] = newc;
    newc.addRef(this);
    this.index++;
  }
  
  i_exitFunction() {
    this.names["*"].removeRef(this);
    delete this.names["*"];
    this.index++;
  }
  
  i_enterExpr() {
    this.nameStack.push(this.names);
    this.varFrame.push(this.vars.length);
    this.names = copyObj(this.names);
    
    // Don't push expr return value
    // because it might get dereferenced by inner scope
    // and it isn't accessible anyway
    delete this.names["<1"];
    delete this.names["<2"];
    
    this.index++;
  }
  
  i_exitExpr(slot) {
    // Determine return value
    let ret;
    if (this.names["$"]) {
      ret = this.names["$"];
    } else if (this.vars.length > 0) {
      ret = this.vars[this.vars.length-1];
    } else {
      this.raiseError("No channels defined when exiting subexpression");
      return;
    }
    
    // Remove references to out of scope channels
    for (let i=this.varFrame[this.varFrame.length-1]; i<this.vars.length; i++) {
      this.vars[i].removeRef(this);
    }
    
    // Restore previous scope
    this.names = copyObject(this.nameStack.pop());
    this.vars.splice(this.varFrame.pop());
    
    // Set return value
    if (this.names["<"+slot])
      this.names["<"+slot].removeRef(this);
    this.names["<"+slot] = ret;
    ret.addRef(this);
  }
  
  pushScope() {
    
  }
  
  popScope() {
    
  }
  
  raiseError(message) {
    this.error = message;
    this.halt = true;
  }
  
  destroy() {
    for (let c of this.vars) {
      c.removeRef(this);
    }
    
    // Expression return values aren't part of normal
    // scope so they must be removed separately
    if (this.names["<1"])
      this.names["<1"].removeRef(this);
    if (this.names["<2"])
      this.names["<2"].removeRef(this);
    
    this.destroy = function() {};
  }
}

class MiniPi {
  constructor(program) {
    this.program = program;
    this.channels = [];
    this.evaluators = [];
    
    this.inputChannel = new AbstractChannel(this);
    this.outputChannel = new AbstractChannel(this);
    
    var that = this;
    this.inputChannel.read = function(rcall) {
      let val = +window.prompt("Input number")
      let ch = new AbstractChannel(that);
      ch.val = val;
      rcall(ch);
    }
    this.outputChannel.write = function(val,wcall) {
      console.log(val.val);
      wcall();
    }
  }
  
  getVar(name) {
    if (name == "i") {
      return this.inputChannel;
    } else if (name == "o") {
      return this.outputChannel;
    } else if (name[0] == "\"" && name[name.length-1] == "\"") {
      let c = new AbstractChannel(this);
      c.val = name.substr(1,name.length-2);
      return c;
    }
  }
}

MiniPi.interpret = function(str) {
  let obj = new MiniPi();
  obj.program = postprocess(str);
  new Evaluator(obj, obj.program);
  return obj;
}

let exports = {parse,postprocess,AbstractChannel,Channel,Evaluator,MiniPi};
window.pilanguage = exports;
})()