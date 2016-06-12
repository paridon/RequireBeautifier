var fs = require('fs');
var esprima = require('esprima');
var estraverse = require('estraverse');
var esrefactor = require('esrefactor');
var escodegen = require('escodegen');

var filename = process.argv[2];

var code = fs.readFileSync(filename, 'utf-8');
var ctx = new esrefactor.Context(code);
var ast = esprima.parse(code, { range: true });

var newcode = "";
var found = true;
while(found) {
    found = false;
    estraverse.traverse(ast, {
        enter: function (node) {
			// Look for requirejs structures:
			//	define('name',['A','B','C']) function (x,y,z,...)
			// and refactor to:
			//  define('name',['A','B','C']) function (A,B,C,...)
            if (node.type === 'CallExpression' 
				&& node.callee.name === 'define') {
                var defines = node.arguments[1];
                var functionExpr = node.arguments[2];
                if (defines.elements && functionExpr.params && defines.elements.length > 0 && functionExpr.params.length > 0)
                    for (var i = 0; i < defines.elements.length; i++) {
                        var ident = functionExpr.params[i];
                        var new_name = defines.elements[i].value.split('/').join('_').split('.').join('').split('-').join('');
                        if (ident && ident.name !== new_name) {
                            var id = ctx.identify(ident.range[0]);
                            newcode = ctx.rename(id, new_name);
                            found = true;
                            return estraverse.VisitorOption.Break;                            
                        }
                    }
            }
        }
    });

    if (found) {
        ast = esprima.parse(newcode, {range: true});
        ctx = new esrefactor.Context(newcode);
    }
}

fs.writeFileSync(filename.replace('.js','_refactored')+'.js', newcode);


