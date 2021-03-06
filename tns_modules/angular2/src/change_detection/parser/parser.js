var __decorate = this.__decorate || function (decorators, target, key, value) {
    var kind = typeof (arguments.length == 2 ? value = target : value);
    for (var i = decorators.length - 1; i >= 0; --i) {
        var decorator = decorators[i];
        switch (kind) {
            case "function": value = decorator(value) || value; break;
            case "number": decorator(target, key, value); break;
            case "undefined": decorator(target, key); break;
            case "object": value = decorator(target, key, value) || value; break;
        }
    }
    return value;
};
var di_1 = require('angular2/di');
var lang_1 = require('angular2/src/facade/lang');
var collection_1 = require('angular2/src/facade/collection');
var lexer_1 = require('./lexer');
var reflection_1 = require('angular2/src/reflection/reflection');
var ast_1 = require('./ast');
var _implicitReceiver = new ast_1.ImplicitReceiver();
var INTERPOLATION_REGEXP = lang_1.RegExpWrapper.create('\\{\\{(.*?)\\}\\}');
var QUOTE_REGEXP = lang_1.RegExpWrapper.create("'");
var Parser = (function () {
    function Parser(lexer, providedReflector) {
        if (providedReflector === void 0) { providedReflector = null; }
        this._lexer = lexer;
        this._reflector = lang_1.isPresent(providedReflector) ? providedReflector : reflection_1.reflector;
    }
    Parser.prototype.parseAction = function (input, location) {
        var tokens = this._lexer.tokenize(input);
        var ast = new _ParseAST(input, location, tokens, this._reflector, true).parseChain();
        return new ast_1.ASTWithSource(ast, input, location);
    };
    Parser.prototype.parseBinding = function (input, location) {
        var tokens = this._lexer.tokenize(input);
        var ast = new _ParseAST(input, location, tokens, this._reflector, false).parseChain();
        return new ast_1.ASTWithSource(ast, input, location);
    };
    Parser.prototype.addPipes = function (bindingAst, pipes) {
        if (collection_1.ListWrapper.isEmpty(pipes))
            return bindingAst;
        var res = collection_1.ListWrapper.reduce(pipes, function (result, currentPipeName) { return new ast_1.Pipe(result, currentPipeName, [], false); }, bindingAst.ast);
        return new ast_1.ASTWithSource(res, bindingAst.source, bindingAst.location);
    };
    Parser.prototype.parseTemplateBindings = function (input, location) {
        var tokens = this._lexer.tokenize(input);
        return new _ParseAST(input, location, tokens, this._reflector, false).parseTemplateBindings();
    };
    Parser.prototype.parseInterpolation = function (input, location) {
        var parts = lang_1.StringWrapper.split(input, INTERPOLATION_REGEXP);
        if (parts.length <= 1) {
            return null;
        }
        var strings = [];
        var expressions = [];
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (i % 2 === 0) {
                collection_1.ListWrapper.push(strings, part);
            }
            else {
                var tokens = this._lexer.tokenize(part);
                var ast = new _ParseAST(input, location, tokens, this._reflector, false).parseChain();
                collection_1.ListWrapper.push(expressions, ast);
            }
        }
        return new ast_1.ASTWithSource(new ast_1.Interpolation(strings, expressions), input, location);
    };
    Parser.prototype.wrapLiteralPrimitive = function (input, location) {
        return new ast_1.ASTWithSource(new ast_1.LiteralPrimitive(input), input, location);
    };
    return Parser;
})();
exports.Parser = Parser;
Object.defineProperty(Parser, "annotations", { get: function () {
        return [new di_1.Injectable()];
    } });
Object.defineProperty(Parser, "parameters", { get: function () {
        return [[lexer_1.Lexer], [reflection_1.Reflector]];
    } });
Object.defineProperty(Parser.prototype.parseAction, "parameters", { get: function () {
        return [[assert.type.string], [assert.type.any]];
    } });
Object.defineProperty(Parser.prototype.parseBinding, "parameters", { get: function () {
        return [[assert.type.string], [assert.type.any]];
    } });
Object.defineProperty(Parser.prototype.addPipes, "parameters", { get: function () {
        return [[ast_1.ASTWithSource], [assert.genericType(collection_1.List, String)]];
    } });
Object.defineProperty(Parser.prototype.parseTemplateBindings, "parameters", { get: function () {
        return [[assert.type.string], [assert.type.any]];
    } });
Object.defineProperty(Parser.prototype.parseInterpolation, "parameters", { get: function () {
        return [[assert.type.string], [assert.type.any]];
    } });
Object.defineProperty(Parser.prototype.wrapLiteralPrimitive, "parameters", { get: function () {
        return [[assert.type.string], [assert.type.any]];
    } });
var _ParseAST = (function () {
    function _ParseAST(input, location, tokens, reflector, parseAction) {
        this.input = input;
        this.location = location;
        this.tokens = tokens;
        this.index = 0;
        this.reflector = reflector;
        this.parseAction = parseAction;
    }
    _ParseAST.prototype.peek = function (offset) {
        var i = this.index + offset;
        return i < this.tokens.length ? this.tokens[i] : lexer_1.EOF;
    };
    Object.defineProperty(_ParseAST.prototype, "next", {
        get: function () {
            return this.peek(0);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(_ParseAST.prototype, "inputIndex", {
        get: function () {
            return (this.index < this.tokens.length) ? this.next.index : this.input.length;
        },
        enumerable: true,
        configurable: true
    });
    _ParseAST.prototype.advance = function () {
        this.index++;
    };
    _ParseAST.prototype.optionalCharacter = function (code) {
        if (this.next.isCharacter(code)) {
            this.advance();
            return true;
        }
        else {
            return false;
        }
    };
    _ParseAST.prototype.optionalKeywordVar = function () {
        if (this.peekKeywordVar()) {
            this.advance();
            return true;
        }
        else {
            return false;
        }
    };
    _ParseAST.prototype.peekKeywordVar = function () {
        return this.next.isKeywordVar() || this.next.isOperator('#');
    };
    _ParseAST.prototype.expectCharacter = function (code) {
        if (this.optionalCharacter(code))
            return;
        this.error("Missing expected " + lang_1.StringWrapper.fromCharCode(code));
    };
    _ParseAST.prototype.optionalOperator = function (op) {
        if (this.next.isOperator(op)) {
            this.advance();
            return true;
        }
        else {
            return false;
        }
    };
    _ParseAST.prototype.expectOperator = function (operator) {
        if (this.optionalOperator(operator))
            return;
        this.error("Missing expected operator " + operator);
    };
    _ParseAST.prototype.expectIdentifierOrKeyword = function () {
        var n = this.next;
        if (!n.isIdentifier() && !n.isKeyword()) {
            this.error("Unexpected token " + n + ", expected identifier or keyword");
        }
        this.advance();
        return n.toString();
    };
    _ParseAST.prototype.expectIdentifierOrKeywordOrString = function () {
        var n = this.next;
        if (!n.isIdentifier() && !n.isKeyword() && !n.isString()) {
            this.error("Unexpected token " + n + ", expected identifier, keyword, or string");
        }
        this.advance();
        return n.toString();
    };
    _ParseAST.prototype.parseChain = function () {
        var exprs = [];
        while (this.index < this.tokens.length) {
            var expr = this.parsePipe();
            collection_1.ListWrapper.push(exprs, expr);
            if (this.optionalCharacter(lexer_1.$SEMICOLON)) {
                if (!this.parseAction) {
                    this.error("Binding expression cannot contain chained expression");
                }
                while (this.optionalCharacter(lexer_1.$SEMICOLON)) { }
            }
            else if (this.index < this.tokens.length) {
                this.error("Unexpected token '" + this.next + "'");
            }
        }
        if (exprs.length == 0)
            return new ast_1.EmptyExpr();
        if (exprs.length == 1)
            return exprs[0];
        return new ast_1.Chain(exprs);
    };
    _ParseAST.prototype.parsePipe = function () {
        var result = this.parseExpression();
        while (this.optionalOperator("|")) {
            if (this.parseAction) {
                this.error("Cannot have a pipe in an action expression");
            }
            var name = this.expectIdentifierOrKeyword();
            var args = collection_1.ListWrapper.create();
            while (this.optionalCharacter(lexer_1.$COLON)) {
                collection_1.ListWrapper.push(args, this.parseExpression());
            }
            result = new ast_1.Pipe(result, name, args, true);
        }
        return result;
    };
    _ParseAST.prototype.parseExpression = function () {
        var start = this.inputIndex;
        var result = this.parseConditional();
        while (this.next.isOperator('=')) {
            if (!result.isAssignable) {
                var end = this.inputIndex;
                var expression = this.input.substring(start, end);
                this.error("Expression " + expression + " is not assignable");
            }
            if (!this.parseAction) {
                this.error("Binding expression cannot contain assignments");
            }
            this.expectOperator('=');
            result = new ast_1.Assignment(result, this.parseConditional());
        }
        return result;
    };
    _ParseAST.prototype.parseConditional = function () {
        var start = this.inputIndex;
        var result = this.parseLogicalOr();
        if (this.optionalOperator('?')) {
            var yes = this.parseExpression();
            if (!this.optionalCharacter(lexer_1.$COLON)) {
                var end = this.inputIndex;
                var expression = this.input.substring(start, end);
                this.error("Conditional expression " + expression + " requires all 3 expressions");
            }
            var no = this.parseExpression();
            return new ast_1.Conditional(result, yes, no);
        }
        else {
            return result;
        }
    };
    _ParseAST.prototype.parseLogicalOr = function () {
        var result = this.parseLogicalAnd();
        while (this.optionalOperator('||')) {
            result = new ast_1.Binary('||', result, this.parseLogicalAnd());
        }
        return result;
    };
    _ParseAST.prototype.parseLogicalAnd = function () {
        var result = this.parseEquality();
        while (this.optionalOperator('&&')) {
            result = new ast_1.Binary('&&', result, this.parseEquality());
        }
        return result;
    };
    _ParseAST.prototype.parseEquality = function () {
        var result = this.parseRelational();
        while (true) {
            if (this.optionalOperator('==')) {
                result = new ast_1.Binary('==', result, this.parseRelational());
            }
            else if (this.optionalOperator('!=')) {
                result = new ast_1.Binary('!=', result, this.parseRelational());
            }
            else {
                return result;
            }
        }
    };
    _ParseAST.prototype.parseRelational = function () {
        var result = this.parseAdditive();
        while (true) {
            if (this.optionalOperator('<')) {
                result = new ast_1.Binary('<', result, this.parseAdditive());
            }
            else if (this.optionalOperator('>')) {
                result = new ast_1.Binary('>', result, this.parseAdditive());
            }
            else if (this.optionalOperator('<=')) {
                result = new ast_1.Binary('<=', result, this.parseAdditive());
            }
            else if (this.optionalOperator('>=')) {
                result = new ast_1.Binary('>=', result, this.parseAdditive());
            }
            else {
                return result;
            }
        }
    };
    _ParseAST.prototype.parseAdditive = function () {
        var result = this.parseMultiplicative();
        while (true) {
            if (this.optionalOperator('+')) {
                result = new ast_1.Binary('+', result, this.parseMultiplicative());
            }
            else if (this.optionalOperator('-')) {
                result = new ast_1.Binary('-', result, this.parseMultiplicative());
            }
            else {
                return result;
            }
        }
    };
    _ParseAST.prototype.parseMultiplicative = function () {
        var result = this.parsePrefix();
        while (true) {
            if (this.optionalOperator('*')) {
                result = new ast_1.Binary('*', result, this.parsePrefix());
            }
            else if (this.optionalOperator('%')) {
                result = new ast_1.Binary('%', result, this.parsePrefix());
            }
            else if (this.optionalOperator('/')) {
                result = new ast_1.Binary('/', result, this.parsePrefix());
            }
            else {
                return result;
            }
        }
    };
    _ParseAST.prototype.parsePrefix = function () {
        if (this.optionalOperator('+')) {
            return this.parsePrefix();
        }
        else if (this.optionalOperator('-')) {
            return new ast_1.Binary('-', new ast_1.LiteralPrimitive(0), this.parsePrefix());
        }
        else if (this.optionalOperator('!')) {
            return new ast_1.PrefixNot(this.parsePrefix());
        }
        else {
            return this.parseCallChain();
        }
    };
    _ParseAST.prototype.parseCallChain = function () {
        var result = this.parsePrimary();
        while (true) {
            if (this.optionalCharacter(lexer_1.$PERIOD)) {
                result = this.parseAccessMemberOrMethodCall(result);
            }
            else if (this.optionalCharacter(lexer_1.$LBRACKET)) {
                var key = this.parseExpression();
                this.expectCharacter(lexer_1.$RBRACKET);
                result = new ast_1.KeyedAccess(result, key);
            }
            else if (this.optionalCharacter(lexer_1.$LPAREN)) {
                var args = this.parseCallArguments();
                this.expectCharacter(lexer_1.$RPAREN);
                result = new ast_1.FunctionCall(result, args);
            }
            else {
                return result;
            }
        }
    };
    _ParseAST.prototype.parsePrimary = function () {
        if (this.optionalCharacter(lexer_1.$LPAREN)) {
            var result = this.parsePipe();
            this.expectCharacter(lexer_1.$RPAREN);
            return result;
        }
        else if (this.next.isKeywordNull() || this.next.isKeywordUndefined()) {
            this.advance();
            return new ast_1.LiteralPrimitive(null);
        }
        else if (this.next.isKeywordTrue()) {
            this.advance();
            return new ast_1.LiteralPrimitive(true);
        }
        else if (this.next.isKeywordFalse()) {
            this.advance();
            return new ast_1.LiteralPrimitive(false);
        }
        else if (this.optionalCharacter(lexer_1.$LBRACKET)) {
            var elements = this.parseExpressionList(lexer_1.$RBRACKET);
            this.expectCharacter(lexer_1.$RBRACKET);
            return new ast_1.LiteralArray(elements);
        }
        else if (this.next.isCharacter(lexer_1.$LBRACE)) {
            return this.parseLiteralMap();
        }
        else if (this.next.isIdentifier()) {
            return this.parseAccessMemberOrMethodCall(_implicitReceiver);
        }
        else if (this.next.isNumber()) {
            var value = this.next.toNumber();
            this.advance();
            return new ast_1.LiteralPrimitive(value);
        }
        else if (this.next.isString()) {
            var value = this.next.toString();
            this.advance();
            return new ast_1.LiteralPrimitive(value);
        }
        else if (this.index >= this.tokens.length) {
            this.error("Unexpected end of expression: " + this.input);
        }
        else {
            this.error("Unexpected token " + this.next);
        }
    };
    _ParseAST.prototype.parseExpressionList = function (terminator) {
        var result = [];
        if (!this.next.isCharacter(terminator)) {
            do {
                collection_1.ListWrapper.push(result, this.parseExpression());
            } while (this.optionalCharacter(lexer_1.$COMMA));
        }
        return result;
    };
    _ParseAST.prototype.parseLiteralMap = function () {
        var keys = [];
        var values = [];
        this.expectCharacter(lexer_1.$LBRACE);
        if (!this.optionalCharacter(lexer_1.$RBRACE)) {
            do {
                var key = this.expectIdentifierOrKeywordOrString();
                collection_1.ListWrapper.push(keys, key);
                this.expectCharacter(lexer_1.$COLON);
                collection_1.ListWrapper.push(values, this.parseExpression());
            } while (this.optionalCharacter(lexer_1.$COMMA));
            this.expectCharacter(lexer_1.$RBRACE);
        }
        return new ast_1.LiteralMap(keys, values);
    };
    _ParseAST.prototype.parseAccessMemberOrMethodCall = function (receiver) {
        var id = this.expectIdentifierOrKeyword();
        if (this.optionalCharacter(lexer_1.$LPAREN)) {
            var args = this.parseCallArguments();
            this.expectCharacter(lexer_1.$RPAREN);
            var fn = this.reflector.method(id);
            return new ast_1.MethodCall(receiver, id, fn, args);
        }
        else {
            var getter = this.reflector.getter(id);
            var setter = this.reflector.setter(id);
            return new ast_1.AccessMember(receiver, id, getter, setter);
        }
    };
    _ParseAST.prototype.parseCallArguments = function () {
        if (this.next.isCharacter(lexer_1.$RPAREN))
            return [];
        var positionals = [];
        do {
            collection_1.ListWrapper.push(positionals, this.parseExpression());
        } while (this.optionalCharacter(lexer_1.$COMMA));
        return positionals;
    };
    _ParseAST.prototype.expectTemplateBindingKey = function () {
        var result = '';
        var operatorFound = false;
        do {
            result += this.expectIdentifierOrKeywordOrString();
            operatorFound = this.optionalOperator('-');
            if (operatorFound) {
                result += '-';
            }
        } while (operatorFound);
        return result.toString();
    };
    _ParseAST.prototype.parseTemplateBindings = function () {
        var bindings = [];
        while (this.index < this.tokens.length) {
            var keyIsVar = this.optionalKeywordVar();
            var key = this.expectTemplateBindingKey();
            this.optionalCharacter(lexer_1.$COLON);
            var name = null;
            var expression = null;
            if (this.next !== lexer_1.EOF) {
                if (keyIsVar) {
                    if (this.optionalOperator("=")) {
                        name = this.expectTemplateBindingKey();
                    }
                    else {
                        name = '\$implicit';
                    }
                }
                else if (!this.peekKeywordVar()) {
                    var start = this.inputIndex;
                    var ast = this.parsePipe();
                    var source = this.input.substring(start, this.inputIndex);
                    expression = new ast_1.ASTWithSource(ast, source, this.location);
                }
            }
            collection_1.ListWrapper.push(bindings, new ast_1.TemplateBinding(key, keyIsVar, name, expression));
            if (!this.optionalCharacter(lexer_1.$SEMICOLON)) {
                this.optionalCharacter(lexer_1.$COMMA);
            }
            ;
        }
        return bindings;
    };
    _ParseAST.prototype.error = function (message, index) {
        if (index === void 0) { index = null; }
        if (lang_1.isBlank(index))
            index = this.index;
        var location = (index < this.tokens.length) ? "at column " + (this.tokens[index].index + 1) + " in" : "at the end of the expression";
        throw new lang_1.BaseException("Parser Error: " + message + " " + location + " [" + this.input + "] in " + this.location);
    };
    return _ParseAST;
})();
Object.defineProperty(_ParseAST, "parameters", { get: function () {
        return [[assert.type.string], [assert.type.any], [collection_1.List], [reflection_1.Reflector], [assert.type.boolean]];
    } });
Object.defineProperty(_ParseAST.prototype.peek, "parameters", { get: function () {
        return [[lang_1.int]];
    } });
Object.defineProperty(_ParseAST.prototype.optionalCharacter, "parameters", { get: function () {
        return [[lang_1.int]];
    } });
Object.defineProperty(_ParseAST.prototype.expectCharacter, "parameters", { get: function () {
        return [[lang_1.int]];
    } });
Object.defineProperty(_ParseAST.prototype.optionalOperator, "parameters", { get: function () {
        return [[assert.type.string]];
    } });
Object.defineProperty(_ParseAST.prototype.expectOperator, "parameters", { get: function () {
        return [[assert.type.string]];
    } });
Object.defineProperty(_ParseAST.prototype.parseExpressionList, "parameters", { get: function () {
        return [[lang_1.int]];
    } });
Object.defineProperty(_ParseAST.prototype.error, "parameters", { get: function () {
        return [[assert.type.string], [lang_1.int]];
    } });
