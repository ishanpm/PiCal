function runApp() {
  window.app = new Vue({
    el: '#app',
    data: {
      source: '+:i-:o',
      env: null
    },
    methods: {
      doCompile: function() {
        this.env = pilanguage.MiniPi.interpret(this.source);
      }
    }
  })
}

window.onload = runApp;