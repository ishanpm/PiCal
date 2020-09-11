// Generated automatically by nearley, version 2.19.0
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }
var grammar = {
    Lexer: undefined,
    ParserRules: [
    {"name": "main", "symbols": ["_", "p"], "postprocess": a => a[1]},
    {"name": "main$string$1", "symbols": [{"literal":"/"}, {"literal":"/"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "main$ebnf$1", "symbols": []},
    {"name": "main$ebnf$1", "symbols": ["main$ebnf$1", /[^\n]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "main", "symbols": ["_", "p", "main$string$1", "main$ebnf$1"], "postprocess": a => a[1]},
    {"name": "p$ebnf$1", "symbols": []},
    {"name": "p$ebnf$1", "symbols": ["p$ebnf$1", "i"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "p", "symbols": ["p$ebnf$1"], "postprocess": id},
    {"name": "i", "symbols": [{"literal":"+"}, "_", "c", "cn"], "postprocess": a => [a[0],a[2],a[3]]},
    {"name": "i", "symbols": [{"literal":"!"}, "_", "c", "cn"], "postprocess": a => [a[0],a[2],a[3]]},
    {"name": "i", "symbols": [{"literal":"-"}, "_", "c", "cc"], "postprocess": a => [a[0],a[2],a[3]]},
    {"name": "i", "symbols": [{"literal":"*"}, "_", "n"], "postprocess": a => [a[0],a[2]]},
    {"name": "i", "symbols": [{"literal":"("}, "_", "p", {"literal":")"}, "_"], "postprocess": a => [a[0],a[2]]},
    {"name": "i", "symbols": [{"literal":"{"}, "_", "c", "a", {"literal":"}"}, "_"], "postprocess": a => [a[0],a[2],a[3]]},
    {"name": "a", "symbols": []},
    {"name": "a", "symbols": [{"literal":"+"}, "_", "n", "a"], "postprocess": a => [[a[0],a[2]]].concat(a[3])},
    {"name": "a", "symbols": [{"literal":"-"}, "_", "c", "a"], "postprocess": a => [[a[0],a[2]]].concat(a[3])},
    {"name": "cc", "symbols": [], "postprocess": a => 0},
    {"name": "cc", "symbols": [{"literal":":"}, "_", "c1"], "postprocess": a => a[2]},
    {"name": "cn", "symbols": [], "postprocess": a => null},
    {"name": "cn", "symbols": [{"literal":":"}, "_", "n1"], "postprocess": a => a[2]},
    {"name": "c", "symbols": [], "postprocess": a => 0},
    {"name": "c", "symbols": ["c1"], "postprocess": id},
    {"name": "c1", "symbols": ["number", "_"], "postprocess": id},
    {"name": "c1", "symbols": ["name", "_"], "postprocess": id},
    {"name": "c1", "symbols": [{"literal":"<"}, "_", "p", {"literal":">"}, "_"], "postprocess": a => a[2]},
    {"name": "n", "symbols": [], "postprocess": a => null},
    {"name": "n", "symbols": ["n1"], "postprocess": id},
    {"name": "n1", "symbols": ["name", "_"], "postprocess": id},
    {"name": "number$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "number$ebnf$1", "symbols": ["number$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "number", "symbols": ["number$ebnf$1"], "postprocess": a => +a[0]},
    {"name": "name$ebnf$1", "symbols": []},
    {"name": "name$ebnf$1", "symbols": ["name$ebnf$1", "namepart"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "name", "symbols": ["namepart1", "name$ebnf$1"], "postprocess": a => a[0]+a[1].join("")},
    {"name": "namepart", "symbols": [/[0-9]/], "postprocess": id},
    {"name": "namepart", "symbols": ["namepart1"], "postprocess": id},
    {"name": "namepart1", "symbols": [/[A-Za-z_#$.]/], "postprocess": id},
    {"name": "namepart1$ebnf$1", "symbols": []},
    {"name": "namepart1$ebnf$1", "symbols": ["namepart1$ebnf$1", /[^"]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "namepart1", "symbols": [{"literal":"\""}, "namepart1$ebnf$1", {"literal":"\""}], "postprocess": a => a[0]+a[1].join("")+a[2]},
    {"name": "namepart1$ebnf$2", "symbols": []},
    {"name": "namepart1$ebnf$2", "symbols": ["namepart1$ebnf$2", /[^']/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "namepart1", "symbols": [{"literal":"'"}, "namepart1$ebnf$2", {"literal":"'"}], "postprocess": a => a[0]+a[1].join("")+a[2]},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", /[\s]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": a => null},
    {"name": "_$ebnf$2", "symbols": []},
    {"name": "_$ebnf$2", "symbols": ["_$ebnf$2", /[\s]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$2", "comment", "_"], "postprocess": a => null},
    {"name": "comment$string$1", "symbols": [{"literal":"/"}, {"literal":"/"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "comment$ebnf$1", "symbols": []},
    {"name": "comment$ebnf$1", "symbols": ["comment$ebnf$1", /[^\n]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "comment", "symbols": ["comment$string$1", "comment$ebnf$1", {"literal":"\n"}]},
    {"name": "comment$string$2", "symbols": [{"literal":"/"}, {"literal":"*"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "comment$string$3", "symbols": [{"literal":"*"}, {"literal":"/"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "comment", "symbols": ["comment$string$2", "cblock", "comment$string$3"]},
    {"name": "cblock", "symbols": []},
    {"name": "cblock", "symbols": [/[^*]/, "cblock"]},
    {"name": "cblock", "symbols": [{"literal":"*"}]},
    {"name": "cblock", "symbols": [{"literal":"*"}, /[^\/]/, "cblock"]}
]
  , ParserStart: "main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
