
var deepphe = {

    toNonCamelCase: function(text) {
        var result = text.replace( /([A-Z])/g, " $1" );
        return result.charAt(0).toUpperCase() + result.slice(1);
    }
}


