/**
{{#ifEquals stringVar "some string value"}}
    ...
{{/ifEquals}}
*/
var ifEquals = function(a, b, opts) {
    if(a === b) {
        return opts.fn(this);
    } else {
        return opts.inverse(this);
    }
};

module.exports = ifEquals; 