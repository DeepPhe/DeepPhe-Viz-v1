/**
{{#inArray value ["elm1", "elm2" ...] }}
    ...
{{/inArray}}
*/
var inArray = function(item, arr, opts) {
    if(arr.indexOf(item) > -1) {
        return opts.fn(this);
    } else {
        return opts.inverse(this);
    }
};

module.exports = inArray; 