var Logger = require('./Logger');
var logger = Logger.logger();

exports.removeHTML = function(htmlString) {
  if (htmlString==null || htmlString=='') return '';

  // Remove HTML tag from java String
  let noHTMLString = htmlString.replace(/<\/?[^>]+(>|$)/g, "");


  // Remove Carriage return from java String
  noHTMLString = noHTMLString.replace("\r", "<br/>");

  // Remove New line from java string and replace html break
  noHTMLString = noHTMLString.replace("\n", " ");
  //noHTMLString = noHTMLString.replace("\"", "&quot;").trim();
  return noHTMLString;
}