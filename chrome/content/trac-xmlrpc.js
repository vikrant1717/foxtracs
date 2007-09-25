
function Tracker() {
  var inst=this;
  var $ = function(x) { return document.getElementById(x) };
  const Cc = Components.classes;
  const Ci = Components.interfaces;
  var PREFS = Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefService).getBranch('extension.foxtracs.');

  function xhrrpc(method, callback) {
    var req = new XMLHttpRequest();
    var base_url = PREFS.getCharPref('baseUrl');
    var url = base_url + '/xmlrpc'

    req.open('POST', url, true);
    req.onreadystatechange = function (aEvt) {
      if (req.readyState == 4 && req.status == 200) {
        var value = req.responseXML.getElementsByTagName('value')[0];
        callback(XMLRPC.decode(getFirstRealChild(value)));
      }
    }
    req.setRequestHeader('Content-Type', 'text/xml');

    var post = "<?xml version='1.0'?>\n<methodCall>";
    post += "<methodName>" + method + "</methodName>";
    if (arguments.length > 2) {
      post += "<params>"
      for (var i=2; i<arguments.length; i++) {
        post += "<param>" + XMLRPC.encode(arguments[i]) + "</param>";
      }
      post += "</params>"
    }
    post += "</methodCall>";
    console.log(post);
    req.send(post);
  }

  function RDF() {
    const RDFS = Cc['@mozilla.org/rdf/rdf-service;1'].getService(Ci.nsIRDFService);
    const RDFCU = Cc['@mozilla.org/rdf/container-utils;1'].getService(Ci.nsIRDFContainerUtils);
    const NSRDF = function(name) { return RDFS.GetResource('http://home.netscape.com/NC-rdf#'+name); }

    var ds = RDFS.GetDataSource('rdf:trac', false);
    var bag = RDFCU.MakeBag(ds, RDFS.GetResource("urn:root"));

    this.add = function( uri, val ) {
      var resource = RDFS.GetResource(uri);
      for (var k in val) {
        ds.Assert(resource, NSRDF(k), RDFS.GetLiteral(val[k]), true);
      }
      bag.AppendElement(resource);
    }

    this.showOn = function(element) {
      element.database.AddDataSource(ds);
      element.builder.rebuild();
    }
  }

  this.init = function() {
    if (PREFS.getPrefType('baseUrl')) {
      inst.load();
    }
    else {
      inst.setup();
    }
  }

  this.save = function() {
    PREFS.setCharPref('baseUrl', $('trac-url').value);
    inst.load();
  }

  this.load = function() {
    var rdf = new RDF();

    rdf.showOn($('mytree'))
    rdf.showOn($('mylist'))

    xhrrpc('ticket.query', function(tickets) {
      for (var i=0; i<tickets.length; i++) {
        xhrrpc('ticket.get', function(info) {
          info[3].id = info[0];
          info[3].created = info[1];
          info[3].changed = info[2];
          rdf.add('ticket:'+info[0], info[3]);
        }, tickets[i]);
      }
    });
    inst.list();
  }
  this.setup = function() {
    if (PREFS.getPrefType('baseUrl')) {
      $('trac-url').value = PREFS.getCharPref('baseUrl');
    }
    $('trac-deck').selectedIndex = 0;
  }
  this.list = function() {
    $('trac-deck').selectedIndex = 1;
  }
  this.tree = function() {
    $('trac-deck').selectedIndex = 2;
  }
}

var tracker = new Tracker();

tracker.init();
