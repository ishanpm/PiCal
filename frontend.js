let examples = {
"cat":
`*loop (!:loop // Whenever "loop" recieves something...
  +val:i      // Read val from input
  -val:o      // Write val to output
  -:loop      // Send something to loop
)

-:loop


/* Click 'compile', then 'run', then type something in the input box and click 'send' */`,
"while loop":
`*var:[[!io|*val *v:[[!io|+:val -:io +:io -:val]] -v:io -[*]:val]]
*get:[[+v-|{v+-}]]
*set:[[+v+val|{v+-val}]]
*while:[[*while+cond+body-|{[{[{cond+}]-[[{body+}{while-cond-body+}]]-[[]]+}]+}]]

{var+x}
{set-x-#1}
{while-[[{le-[{get-x+}]-#5+}]]-[[
  {get-x+val}
  -val:o
  {set-x-[{plus-val-#1+}]}
]]+}
-"Done":o`,
"fibonacci":
`*fibonacci:[[*fibonacci !io +n|
  {[{[{lt-n-#2+}]-[[
    -#1:io
  ]]-[[
    {*a| fibonacci-[{minus-n-#1+}]}
    {*b| fibonacci-[{minus-n-#2+}]}
    -[{plus-[+:a]-[+:b]+}]:io
  ]]+}]+}
]]

{[[*r| +n:i {fibonacci-n+} -:o {r}]]}`
}

function runApp() {
  window.app = new Vue({
    el: '#app',
    data: {
      source: examples["cat"],
      examples: examples,
      exampleName: "cat",
      speed: 0,
      env: null,
      inputValue: "",
      output: "",
    },
    watch: {
      exampleName: function(value, oldValue) {
        if (value in this.examples) {
          this.source = this.examples[value];
        }
      },
      
    },
    methods: {
      doCompile: function() {
        try {
          this.env = pilanguage.MiniPi.interpret(this.source);
          this.env.onOutput = this.pushOutput.bind(this)
          this.output = "";
        } catch (e) {
          if (/^Syntax error at/.test(e.message)) {
            // Nearley's error messages are descriptive, but a little long
            this.output = e.message.split("\n").splice(0,4).join("\n")
          } else {
            this.output = e.message
          }
          console.error(e)
        }
      },
      
      pushOutput: function(val) {
        this.output += val + "\n"
        let container = this.$refs.outputContainer
        container.scrollTop = container.scrollHeight;
      },
      
      pushInput: function(val) {
        if (!isNaN(parseFloat(val))) {
          this.env.pushInput(parseFloat(val));
        } else {
          this.env.pushInput(val);
        }
      },
      
      sourceChanged: function() {
        this.exampleName = "";
      },
      
      tick: function() {
        if (this.env && this.speed>0 && isFinite(this.speed)) {
          for (let i=0; i<this.speed; i++) {
            this.env.stepAll();
          }
        }
      }
    }
  })
}

window.onload = runApp;

function loop() {
  try {
    if (app && app.tick) app.tick();
  } catch (e) {
    console.error(e);
  }
  
  window.requestAnimationFrame(loop);
}

window.requestAnimationFrame(loop);