module.exports.stringHasLength = function(line) {
  return line && line.length;
};

module.exports.defaultCallback = function(callback) {
  return 'function' === typeof callback ? callback : function() {};
};

module.exports.removeSpaces = function (string) {
  return (string || "").replace(/^\s*|\s*$/g, '');
};