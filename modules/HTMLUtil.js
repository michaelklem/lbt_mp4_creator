var Logger = require('./Logger');
var logger = Logger.logger();

exports.removeHTML = function(htmlString) {
  if (htmlString==null || htmlString=='') return '';

  // Remove HTML tag from java String
  let noHTMLString = htmlString.replace(/<\/?[^>]+(>|$)/g, "");


  // Remove Carriage return from java String
  noHTMLString = noHTMLString.replaceAll("\r", "<br/>");

  // Remove New line from java string and replace html break
  noHTMLString = noHTMLString.replaceAll("\n", " ");
  noHTMLString = noHTMLString.replaceAll("\"", "&quot;").trim();
  return noHTMLString;
}