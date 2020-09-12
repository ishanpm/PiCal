let expect = chai.expect;
let assert = chai.assert;

describe('Parser', function() {
  let parse = pilanguage.parse;
    
  describe('basic commands', function() {
    it('should parse basic commands', function() {
      let source = "+a:b";
      let result = parse(source);
      let expected = [["+", "a", "b"]]
      assert.deepEqual(result, expected)
      
      source = "-a:b";
      result = parse(source);
      expected = [["-", "a", "b"]]
      assert.deepEqual(result, expected)
      
      source = "!a:b";
      result = parse(source);
      expected = [["!", "a", "b"]]
      assert.deepEqual(result, expected)
      
      source = "*a:b";
      result = parse(source);
      expected = [["*", "a", "b"]]
      assert.deepEqual(result, expected)
    });
    
    it('should fill missing arguments with null', function() {
      let source = "+a";
      let result = parse(source);
      assert.equal(result[0][2], null)
      
      source = "+:b";
      result = parse(source);
      assert.equal(result[0][1], null)
      
      source = "+";
      result = parse(source);
      assert.equal(result[0][1], null)
      assert.equal(result[0][2], null)
    });
    
    it('should accept whitespace anywhere', function() {
      let source = " +\t  a \n:\r\n b ";
      let result = parse(source);
      expect(result).to.have.lengthOf(1)
    })
    
    it('should return a list of all commands', function() {
      let source = "+a:b -c:d";
      let result = parse(source);
      
      expect(result).to.have.lengthOf(2)
    });
  });
  
  describe('branches', function() {
    it('should enclose a program block', function() {
      let source = "(+++)";
      let result = parse(source);
      expect(result).to.have.lengthOf(1)
      expect(result[0]).to.have.lengthOf(2)
      expect(result[0][1]).to.have.lengthOf(3)
    })
    
    it('should be nestable', function() {
      let source = "(++(+)+)";
      let result = parse(source);
      expect(result).to.have.lengthOf(1)
      expect(result[0]).to.have.lengthOf(2)
      expect(result[0][1]).to.have.lengthOf(4)
      expect(result[0][1][2]).to.have.lengthOf(2)
      expect(result[0][1][2][1]).to.have.lengthOf(1)
    })
  })
  
  describe('names', function() {
    it('should accept names containing alphanumerics, #, _, $', function() {
      let source = "+#my_Variable_i$_c00l"
      let result = parse(source);
      expect(result[0][1]).to.equal("#my_Variable_i$_c00l")
    })
    
    it('should accept numbers (where the name will not be written to)', function() {
      let source = "+a:1"
      let result = parse(source);
      expect(result[0][2]).to.equal(1)
      
      source = "-1:2"
      result = parse(source);
      expect(result[0][1]).to.equal(1)
      expect(result[0][2]).to.equal(2)
      
      source = "*a:1"
      result = parse(source);
      expect(result[0][2]).to.equal(1)
      
      source = "!a:1"
      result = parse(source);
      expect(result[0][2]).to.equal(1)
    })
    
    it('should reject names starting with a number', function() {
      let source = "+0hai"
      assert.throws(_ => parse(source), Error)
    })
    
    it('should accept names enclosed in single or double quotes', function() {
      let source = `+"foo'"`
      let result = parse(source);
      expect(result[0][1]).to.equal(`"foo'"`)
      
      source = `+'bar"'`
      result = parse(source);
      expect(result[0][1]).to.equal(`'bar"'`)
    })
    
    it('should accept name parts enclosed in single or double quotes?', function() {
      let source = `+"foo'"'bar"'baz`
      let result = parse(source);
      expect(result[0][1]).to.equal(`"foo'"'bar"'baz`)
    })
    
    it.skip('should accept backslash-escaped quotes?', function() {
      let source = '+"a\\"b"'
      let result = parse(source);
      expect(result[0][1]).to.equal('"a\\"b"')
      
      source = '+"a\\\\"'
      result = parse(source);
      expect(result[0][1]).to.equal('""a\\\\"')
    })
  })
  
  describe('comments', function() {
    it('should treat line comments as whitespace', function() {
      let source = "+ // Hi there!"
      let result = parse(source);
      expect(result).to.have.lengthOf(1)
    })
    
    it('should end line comments at a newline', function() {
      let source = "+ // Hi there!\n+"
      let result = parse(source);
      expect(result).to.have.lengthOf(2)
    })
    
    it('should allow / and * in line comments', function() {
      let source = "+ // // /* Very comment.\n+"
      let result = parse(source);
      expect(result).to.have.lengthOf(2)
    })
    
    it('should treat block comments as whitespace', function() {
      let source = "+ /* foo bar */ +"
      let result = parse(source);
      expect(result).to.have.lengthOf(2)
    })
    
    it('should allow / and * in block comments', function() {
      let source = "+ /* foo //** bar */ +"
      let result = parse(source);
      expect(result).to.have.lengthOf(2)
      
      source = "+ /*/*/ +"
      result = parse(source);
      expect(result).to.have.lengthOf(2)
      
      source = "+ /*/**/ +"
      result = parse(source);
      expect(result).to.have.lengthOf(2)
      
      source = "+ /**//**/ +"
      result = parse(source);
      expect(result).to.have.lengthOf(2)
      
      source = "+ /* // Meta comment? */ +"
      result = parse(source);
      expect(result).to.have.lengthOf(2)
    })
  })
  
  describe('function shorthand', function() {
    it('should work with no arguments')
    it('should work with arguments')
    it('should allow omitting the function')
    it('should allow overriding the io channel')
    it('should allow naming the io channel')
  })
  
  describe('expression shorthand', function() {
    it('should be usable in place of a name (that won\'t be written to)')
    it('should allow explicitly named output')
    it('should be nestable (please never actually do this)')
  })
  
  describe('unevaluated shorthand', function() {
    it('should be usable in place of a name (that won\'t be written to)')
    it('should have default (0 in, 1 out) signature')
    it('should allow custom function signature')
    it('should allow naming the self channel')
    it('should allow naming the io channel')
  })
});

describe('Postprocessor', function() {
  let postprocess = pilanguage.postprocess
  
  describe('basic commands', function() {
    it('should compile commands that take an lvalue and rvalue (+,!,*)', function() {
      for (let command of ['+','!','*']) {
        let source = [['+', 'a', 'b']]
        let result = postprocess(source)
        let expected = ['&','a','=','b','+']
        expect(result).to.deep.equal(expected)
      }
    })
    
    it('should compile commands that take two rvalues (-)', function() {
      let source = [['-', 'a', 'b']]
      let result = postprocess(source)
      let expected = ['=','a','=','b','-']
      expect(result).to.deep.equal(expected)
    })
  })
  describe('branches', function() {})
  describe('function shorthand', function() {})
  describe('expression shorthand', function() {
    it('should be usable in place of a name (that won\'t be written to)', function() {
      let source = [['-', 'a', ['[',null,[]]]]
      let result = postprocess(source)
      expect(result).to.deep.equal(['=','a','=',null,'-'])
    })
    it('should allow explicitly named output', function() {
      let source = [['-', 'a', ['[','b',[]]]]
      let result = postprocess(source)
      expect(result).to.deep.equal(['=','a','=','b','-'])
    })
    it('should run the expression', function() {
      let source = [['-', 'a', ['[','b',[['+','c','d']]]]]
      let result = postprocess(source)
      expect(result).to.deep.equal(['=','a','&','c','=','d','+','=','b','-'])
    })
  })
  describe('unevaluated shorthand', function() {
    it('should be usable in place of a name (that won\'t be written to)', function() {
      let source = [['-', 'a', ['[[',[null,null,[],[]],[]]]]
      let result = postprocess(source)
      expect(result).to.deep.equal(['=','a','[[',['&',null,'&',null,'[[*'],'-'])
    })
    it('should allow custom function signature', function() {
      let source = [['-', 'a', ['[[',[null,null,['a','b'],['c','d']],[]]]]
      let result = postprocess(source)
      expect(result).to.deep.equal(['=','a','[[',['&',null,'&',null,'[[*',
        '&','a','{+',
        '&','b','{+',
        '=','c','{-',
        '=','d','{-'
      ],'-'])
    })
    it('should allow naming the self channel', function() {
      let source = [['-', 'a', ['[[',['f',null,[],[]],[]]]]
      let result = postprocess(source)
      expect(result).to.deep.equal(['=','a','[[',['&','f','&',null,'[[*'],'-'])
    })
    it('should allow naming the io channel', function() {
      let source = [['-', 'a', ['[[',[null,'io',[],[]],[]]]]
      let result = postprocess(source)
      expect(result).to.deep.equal(['=','a','[[',['&',null,'&','io','[[*'],'-'])
    })
    it('should run the expression', function() {
      let source = [['-', 'a', ['[[',[null,null,['a'],['b']],[['+','b','a']]]]]
      let result = postprocess(source)
      expect(result).to.deep.equal(['=','a','[[',['&',null,'&',null,'[[*',
        '&','a','{+',
        '&','b','=','a','+'
        '=','b','{-'
      ],'-'])
    })
  })
});

describe('Bytecode machine', function() {
  describe('read', function() {})
  describe('write', function() {})
  describe('write', function() {})
  describe('branches', function() {})
  describe('function shorthand', function() {})
  describe('expression shorthand', function() {})
  describe('unevaluated shorthand', function() {})
});