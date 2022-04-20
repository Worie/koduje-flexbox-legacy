(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _diffDOM = require('./diffDOM/diffDOM');

var _diffDOM2 = _interopRequireDefault(_diffDOM);

var _lodashCustomMin = require('./lodash/lodash.custom.min.js');

var _lodashCustomMin2 = _interopRequireDefault(_lodashCustomMin);

var _internal = require('./internal');

var _internal2 = _interopRequireDefault(_internal);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(function (interactiveEbook) {
  'use strict';

  // snippet files is array that contains whole files that were send here (with contents, markers etc) * should there be markers?
  // get rid of those soon

  var snippetFiles = [];
  var files = [];
  var lastRenderedHtml = void 0;

  var hasBeenRenderedBefore = false;

  var currentHTML = document.createElement('html');
  var currentDocument = void 0;

  // recon this one too
  var sandbox = void 0;

  var renderers = void 0;

  var constantElements = [];

  // html snippets need to be rendered first. If css/js files are rendered before html,
  // their presence will be lost (attempt to write to array that is still undefined)

  var getRenderHtmlSnippet = function getRenderHtmlSnippet(document) {
    return function (file, incremental) {
      window.internal.config.document = document;
      // split to separate funcitons
      var fileName = file.fileName;
      var toBeRendered = [];
      var linkedAssets = [];

      currentDocument = document;

      var tmp = [];
      tmp['js'] = [];
      tmp['css'] = [];

      // very hacky, but will do
      //    document.querySelector('html').kodujeConstantAssets.forEach()

      var nextHTML = document.createElement('html');
      nextHTML.innerHTML = file.contents;

      // those two nodes are pretty much static. Could be moved somewhere
      var baseHTMLEl = document.createElement('base');
      // chapterId is passed from spawnedWindow.js and the other one
      baseHTMLEl.href = window.origin + '/' + window.internal.config.chapterId + '/';
      baseHTMLEl.setAttribute('data-snippet-locked', true);

      nextHTML.querySelector('head').appendChild(baseHTMLEl);

      //    const internalScript = document.createElement('script');
      //    // This is provided by spawnedWindow.js or embeddedIframe.js
      //    internalScript.innerHTML = `(${})(${JSON.stringify(window.internal.config)});`;
      //    nextHTML.querySelector('body').appendChild(internalScript);

      // add every style and script to array

      Array.from(nextHTML.querySelectorAll('link[href]')).forEach(function (node) {
        var href = node.getAttribute('href');
        tmp['css'].push(href);
        linkedAssets.push(href);
        node.parentNode.removeChild(node);
      });

      Array.from(nextHTML.querySelectorAll('script[src]')).forEach(function (node) {
        var src = node.getAttribute('src');
        tmp['js'].push(src);
        linkedAssets.push(src);
        node.parentNode.removeChild(node);
      });

      if (!files[fileName]) {
        files[fileName] = [];
        files[fileName]['js'] = tmp['js'];
        files[fileName]['css'] = tmp['css'];
      }

      //
      //
      //    Object.keys(files[fileName]).forEach(type => {
      //      files[fileName][type] = files[fileName][type].filter(el => {
      //        console.log(el, tmp[type], tmp[type].includes(el));
      //        return tmp[type].includes(el)
      //      });
      //    });


      //    Object.keys(tmp).forEach(type => {
      //      tmp[type].filter(el => files[fileName][type].includes(el));
      //      toBeRendered = toBeRendered.concat(tmp[type]);
      //    });

      lastRenderedHtml = file.fileName;
      if (!_lodashCustomMin2.default.isEqual(tmp.js, files[fileName].js) || !_lodashCustomMin2.default.isEqual(tmp.css, files[fileName].css)) {
        incremental = false;
        toBeRendered = linkedAssets;
        files[fileName] = tmp;
      }

      //reconsider this
      if (!incremental) {
        currentDocument.querySelector('html').innerHTML = nextHTML.innerHTML;
        window.internal.script(window.internal.config);
      } else {
        var dd = new _diffDOM2.default({
          preDiffApply: function preDiffApply(info) {
            var e = info.diff.e;

            if (e && e.attributes) {
              if (e.attributes.hasOwnProperty('data-snippet-asset') && linkedAssets.includes(e.attributes['data-snippet-asset']) || e.attributes.hasOwnProperty('data-snippet-locked')) {
                return true;
              }
            }
          }
        });

        var currentHtml = currentDocument.querySelector('html');

        var diff = dd.diff(currentHtml, nextHTML);
        try {
          dd.apply(currentHtml, diff);
        } catch (err) {}
      }
      return toBeRendered;
    };
  };

  var getRenderCssSnippet = function getRenderCssSnippet(document) {
    return function (file, reRender) {
      if (files[lastRenderedHtml]['css'].includes(file.fileName)) {
        var newStyleEl = document.createElement('style');
        newStyleEl.innerHTML = file.contents;
        newStyleEl.setAttribute('data-snippet-asset', file.fileName);

        var oldStyleEl = currentDocument.querySelector('[data-snippet-asset="' + file.fileName + '"]');
        var head = currentDocument.querySelector('head');

        if (oldStyleEl) head.removeChild(oldStyleEl);
        head.appendChild(newStyleEl);
      }
    };
  };

  var catchScriptError = function catchScriptError(file) {
    window.internal = window.internal || {};
    window.internal.lastErr = window.internal.lastErr || "null";
    var internalFn = function internalFn(obj) {
      window.internal = window.internal || {};
      try {
        eval(obj.codeInFunc());

        // dry 1
        if (window.internal.errTimeout) {
          clearTimeout(window.internal.errTimeout);
        }
        window.internal.errTimeout = setTimeout(function () {
          console.info('%cFile ' + obj.fileName + ' is valid', "color: green;");
        }, 1500);
      } catch (err) {
        window.internal.lastErr = err;
        console.warn("Delaying error reporting...");

        // dry 1
        if (window.internal.errTimeout) {
          clearTimeout(window.internal.errTimeout);
        }
        window.internal.errTimeout = setTimeout(function () {
          console.error(window.internal.lastErr);
        }, 1500);
      }
    };

    // recheck with ` in src file
    return '(' + internalFn + ')({fileName: "' + file.fileName + '", codeInFunc: function() {eval(`' + file.contents.replace(/\`/g, '\\`') + '`)}});';
  };

  var getRenderJsSnippet = function getRenderJsSnippet(document) {
    return function (file, reRender) {
      if (files[lastRenderedHtml]['js'].includes(file.fileName)) {
        var newScriptEl = document.createElement('script');
        newScriptEl.innerHTML = catchScriptError(file);
        newScriptEl.setAttribute('data-snippet-asset', file.fileName);

        var oldScriptEl = currentDocument.querySelector('[data-snippet-asset="' + file.fileName + '"]');
        var body = currentDocument.querySelector('body');

        if (oldScriptEl) body.removeChild(oldScriptEl);

        body.appendChild(newScriptEl);
      }
    };
  };

  var parseData = function parseData(data) {
    try {
      return JSON.parse(data);
    } catch (error) {
      //      console.log('not json:', data);
      //      console.error(error);
    }
  };

  var renderData = function renderData(data) {
    snippetFiles = data.snippet.files;
    var singleFileToRender = data.renderOnly;

    if (singleFileToRender && !/.js/.test(singleFileToRender)) {
      var file = snippetFiles.find(function (x) {
        return x.fileName === singleFileToRender;
      });
      var toBeRendered = renderers[file.cmMode](file, true);

      if (toBeRendered) {
        snippetFiles = snippetFiles.filter(function (file) {
          return toBeRendered.includes(file.fileName);
        });
      } else {
        return;
      }
    }

    // make sure html files are always send first
    // move it
    snippetFiles.sort(function (a, b) {
      var regex = /html/g;
      var x = regex.test(a.fileName);
      var y = regex.test(b.fileName);

      if (x) return -1;
      if (y) return 1;
      return 0;
    });

    snippetFiles.forEach(function (file) {

      if (file.cmMode in renderers) {
        // TODO change it to something else than cmMode
        renderers[file.cmMode](file);
        // ACK if possible.
        //          if (event.source) {
        //            event.source.postMessage('rendered', event.origin);
        //          }
      }
    });

    if (!hasBeenRenderedBefore) {
      window.internal.script(window.internal.config);
      hasBeenRenderedBefore = true;
    }
  };

  var getMessageReceiver = function getMessageReceiver(container) {
    sandbox = interactiveEbook.common.getIframeWindow(container).document;
    renderers = {
      css: getRenderCssSnippet(sandbox),
      // todo: do not base on htmlmixed as it is a cm syntax highlight mode only. It may not be html file
      htmlmixed: getRenderHtmlSnippet(sandbox),
      javascript: getRenderJsSnippet(sandbox)
    };

    return function (event) {
      if (!event.data) {
        //        console.log('no data');
        return;
      }

      var data = parseData(event.data);
      if (!data) {
        //        console.log('event.data', event.data);
        return;
      }

      if (!data.snippet) {
        return;
      }

      renderData(data);
    };
  };

  var getChannelId = function getChannelId() {
    return new Map(location.search.split(/[&\\?]/).map(function (str) {
      return str.split('=');
    }).filter(function (_ref) {
      var length = _ref.length;
      return length === 2;
    })).get('channel');
  };

  var init = function init() {
    var container = document.createElement('iframe');
    container.style.borderWidth = 0;
    document.body.appendChild(container);
    var internalStyleEl = document.createElement('style');
    document.head.appendChild(internalStyleEl);
    internalStyleEl.innerHTML = 'body {margin: 0px;}';

    interactiveEbook.common.styleIframe(container, {
      parent: document.body
    });

    var channelId = getChannelId();
    var eventSource = channelId ? new EventSource('http://localhost:8000/channel/' + channelId) : window;

    // Chrome and Safari
    eventSource.addEventListener('message', getMessageReceiver(container), false);

    // Firefox
    eventSource.addEventListener('load', function () {
      eventSource.addEventListener('message', getMessageReceiver(container), false);
    });

    if (interactiveEbook.lastRenderedSnippet) {
      renderData({ snippet: interactiveEbook.lastRenderedSnippet });
    }
  };

  var isEmbedded = window !== window.top;

  try {
    init();

    if (isEmbedded) {
      window.parent.postMessage('clientInstalled', window.parent.location.origin);
    }
  } catch (error) {
    if (isEmbedded) {
      window.parent.postMessage('clientInstallationFailed:' + error.message, window.parent.location.origin);
    }
  }
})(function (global) {
  global.interactiveEbook = global.interactiveEbook || {};
  return global.interactiveEbook;
}(window));

},{"./diffDOM/diffDOM":3,"./internal":5,"./lodash/lodash.custom.min.js":6}],2:[function(require,module,exports){
'use strict';

(function (interactiveEbook) {
  'use strict';

  var injectScript = function injectScript(document, relativePath) {
    var clientScript = document.createElement('script');
    clientScript.setAttribute('type', 'text/javascript');
    clientScript.setAttribute('src', location.href.replace('index.html', relativePath));
    document.body.appendChild(clientScript);
  };

  var styleIframe = function styleIframe(iframe, _ref) {
    var parent = _ref.parent;

    iframe.style.borderWidth = 0;

    var _getComputedStyle = getComputedStyle(parent),
        width = _getComputedStyle.width,
        height = _getComputedStyle.height,
        paddingLeft = _getComputedStyle.paddingLeft;

    iframe.style.height = '100%';
    iframe.style.width = '100%';
    iframe.style.position = 'relative';
    iframe.style.overflow = 'hidden';
  };

  var sendSnippet = function sendSnippet(snippet, window) {
    window.postMessage(JSON.stringify(snippet), location.origin);
  };

  /**
   * @todo dedupe client and main
   * @see http://stackoverflow.com/a/11797741/413256
   * @param iframe_object
   * @returns {*}
   */
  function getIframeWindow(iframe_object) {
    var doc;

    if (iframe_object.contentWindow) {
      return iframe_object.contentWindow;
    }

    if (iframe_object.window) {
      return iframe_object.window;
    }

    if (!doc && iframe_object.contentDocument) {
      doc = iframe_object.contentDocument;
    }

    if (!doc && iframe_object.document) {
      doc = iframe_object.document;
    }

    if (doc && doc.defaultView) {
      return doc.defaultView;
    }

    if (doc && doc.parentWindow) {
      return doc.parentWindow;
    }

    return undefined;
  }

  interactiveEbook.common.getIframeWindow = getIframeWindow;
  interactiveEbook.common.injectScript = injectScript;
  interactiveEbook.common.styleIframe = styleIframe;
  interactiveEbook.common.sendSnippet = sendSnippet;
})(function (global) {
  global.interactiveEbook = global.interactiveEbook || {};
  global.interactiveEbook.common = global.interactiveEbook.common || {};
  return global.interactiveEbook;
}(window));

},{}],3:[function(require,module,exports){
"use strict";

(function () {
    "use strict";

    var diffcount;

    var Diff = function Diff(options) {
        var diff = this;
        if (options) {
            Object.keys(options).forEach(function (option) {
                diff[option] = options[option];
            });
        }
    };

    Diff.prototype = {
        toString: function toString() {
            return JSON.stringify(this);
        },
        setValue: function setValue(aKey, aValue) {
            this[aKey] = aValue;
            return this;
        }
    };

    var SubsetMapping = function SubsetMapping(a, b) {
        this.oldValue = a;
        this.newValue = b;
    };

    SubsetMapping.prototype = {
        contains: function contains(subset) {
            if (subset.length < this.length) {
                return subset.newValue >= this.newValue && subset.newValue < this.newValue + this.length;
            }
            return false;
        },
        toString: function toString() {
            return this.length + " element subset, first mapping: old " + this.oldValue + " → new " + this.newValue;
        }
    };

    var elementDescriptors = function elementDescriptors(el) {
        var output = [];
        if (el.nodeName !== '#text' && el.nodeName !== '#comment') {
            output.push(el.nodeName);
            if (el.attributes) {
                if (el.attributes['class']) {
                    output.push(el.nodeName + '.' + el.attributes['class'].replace(/ /g, '.'));
                }
                if (el.attributes.id) {
                    output.push(el.nodeName + '#' + el.attributes.id);
                }
            }
        }
        return output;
    };

    var findUniqueDescriptors = function findUniqueDescriptors(li) {
        var uniqueDescriptors = {},
            duplicateDescriptors = {};

        li.forEach(function (node) {
            elementDescriptors(node).forEach(function (descriptor) {
                var inUnique = descriptor in uniqueDescriptors,
                    inDupes = descriptor in duplicateDescriptors;
                if (!inUnique && !inDupes) {
                    uniqueDescriptors[descriptor] = true;
                } else if (inUnique) {
                    delete uniqueDescriptors[descriptor];
                    duplicateDescriptors[descriptor] = true;
                }
            });
        });

        return uniqueDescriptors;
    };

    var uniqueInBoth = function uniqueInBoth(l1, l2) {
        var l1Unique = findUniqueDescriptors(l1),
            l2Unique = findUniqueDescriptors(l2),
            inBoth = {};

        Object.keys(l1Unique).forEach(function (key) {
            if (l2Unique[key]) {
                inBoth[key] = true;
            }
        });

        return inBoth;
    };

    var removeDone = function removeDone(tree) {
        delete tree.outerDone;
        delete tree.innerDone;
        delete tree.valueDone;
        if (tree.childNodes) {
            return tree.childNodes.every(removeDone);
        } else {
            return true;
        }
    };

    var isEqual = function isEqual(e1, e2) {

        var e1Attributes, e2Attributes;

        if (!['nodeName', 'value', 'checked', 'selected', 'data'].every(function (element) {
            if (e1[element] !== e2[element]) {
                return false;
            }
            return true;
        })) {
            return false;
        }

        if (Boolean(e1.attributes) !== Boolean(e2.attributes)) {
            return false;
        }

        if (Boolean(e1.childNodes) !== Boolean(e2.childNodes)) {
            return false;
        }

        if (e1.attributes) {
            e1Attributes = Object.keys(e1.attributes);
            e2Attributes = Object.keys(e2.attributes);

            if (e1Attributes.length !== e2Attributes.length) {
                return false;
            }
            if (!e1Attributes.every(function (attribute) {
                if (e1.attributes[attribute] !== e2.attributes[attribute]) {
                    return false;
                }
            })) {
                return false;
            }
        }

        if (e1.childNodes) {
            if (e1.childNodes.length !== e2.childNodes.length) {
                return false;
            }
            if (!e1.childNodes.every(function (childNode, index) {
                return isEqual(childNode, e2.childNodes[index]);
            })) {

                return false;
            }
        }

        return true;
    };

    var roughlyEqual = function roughlyEqual(e1, e2, uniqueDescriptors, sameSiblings, preventRecursion) {
        var childUniqueDescriptors, nodeList1, nodeList2;

        if (!e1 || !e2) {
            return false;
        }

        if (e1.nodeName !== e2.nodeName) {
            return false;
        }

        if (e1.nodeName === '#text') {
            // Note that we initially don't care what the text content of a node is,
            // the mere fact that it's the same tag and "has text" means it's roughly
            // equal, and then we can find out the true text difference later.
            return preventRecursion ? true : e1.data === e2.data;
        }

        if (e1.nodeName in uniqueDescriptors) {
            return true;
        }

        if (e1.attributes && e2.attributes) {

            if (e1.attributes.id && e1.attributes.id === e2.attributes.id) {
                var idDescriptor = e1.nodeName + '#' + e1.attributes.id;
                if (idDescriptor in uniqueDescriptors) {
                    return true;
                }
            }
            if (e1.attributes['class'] && e1.attributes['class'] === e2.attributes['class']) {
                var classDescriptor = e1.nodeName + '.' + e1.attributes['class'].replace(/ /g, '.');
                if (classDescriptor in uniqueDescriptors) {
                    return true;
                }
            }
        }

        if (sameSiblings) {
            return true;
        }

        nodeList1 = e1.childNodes ? e1.childNodes.slice().reverse() : [];
        nodeList2 = e2.childNodes ? e2.childNodes.slice().reverse() : [];

        if (nodeList1.length !== nodeList2.length) {
            return false;
        }

        if (preventRecursion) {
            return nodeList1.every(function (element, index) {
                return element.nodeName === nodeList2[index].nodeName;
            });
        } else {
            // note: we only allow one level of recursion at any depth. If 'preventRecursion'
            // was not set, we must explicitly force it to true for child iterations.
            childUniqueDescriptors = uniqueInBoth(nodeList1, nodeList2);
            return nodeList1.every(function (element, index) {
                return roughlyEqual(element, nodeList2[index], childUniqueDescriptors, true, true);
            });
        }
    };

    var cloneObj = function cloneObj(obj) {
        //  TODO: Do we really need to clone here? Is it not enough to just return the original object?
        return JSON.parse(JSON.stringify(obj));
        //return obj;
    };

    /**
     * based on https://en.wikibooks.org/wiki/Algorithm_implementation/Strings/Longest_common_substring#JavaScript
     */
    var findCommonSubsets = function findCommonSubsets(c1, c2, marked1, marked2) {
        var lcsSize = 0,
            index = [],
            matches = Array.apply(null, new Array(c1.length + 1)).map(function () {
            return [];
        }),
            // set up the matching table
        uniqueDescriptors = uniqueInBoth(c1, c2),

        // If all of the elements are the same tag, id and class, then we can
        // consider them roughly the same even if they have a different number of
        // children. This will reduce removing and re-adding similar elements.
        subsetsSame = c1.length === c2.length,
            origin,
            ret;

        if (subsetsSame) {

            c1.some(function (element, i) {
                var c1Desc = elementDescriptors(element),
                    c2Desc = elementDescriptors(c2[i]);
                if (c1Desc.length !== c2Desc.length) {
                    subsetsSame = false;
                    return true;
                }
                c1Desc.some(function (description, i) {
                    if (description !== c2Desc[i]) {
                        subsetsSame = false;
                        return true;
                    }
                });
                if (!subsetsSame) {
                    return true;
                }
            });
        }

        // fill the matches with distance values
        c1.forEach(function (c1Element, c1Index) {
            c2.forEach(function (c2Element, c2Index) {
                if (!marked1[c1Index] && !marked2[c2Index] && roughlyEqual(c1Element, c2Element, uniqueDescriptors, subsetsSame)) {
                    matches[c1Index + 1][c2Index + 1] = matches[c1Index][c2Index] ? matches[c1Index][c2Index] + 1 : 1;
                    if (matches[c1Index + 1][c2Index + 1] >= lcsSize) {
                        lcsSize = matches[c1Index + 1][c2Index + 1];
                        index = [c1Index + 1, c2Index + 1];
                    }
                } else {
                    matches[c1Index + 1][c2Index + 1] = 0;
                }
            });
        });
        if (lcsSize === 0) {
            return false;
        }
        origin = [index[0] - lcsSize, index[1] - lcsSize];
        ret = new SubsetMapping(origin[0], origin[1]);
        ret.length = lcsSize;

        return ret;
    };

    /**
     * This should really be a predefined function in Array...
     */
    var makeArray = function makeArray(n, v) {
        return Array.apply(null, new Array(n)).map(function () {
            return v;
        });
    };

    /**
     * Generate arrays that indicate which node belongs to which subset,
     * or whether it's actually an orphan node, existing in only one
     * of the two trees, rather than somewhere in both.
     *
     * So if t1 = <img><canvas><br>, t2 = <canvas><br><img>.
     * The longest subset is "<canvas><br>" (length 2), so it will group 0.
     * The second longest is "<img>" (length 1), so it will be group 1.
     * gaps1 will therefore be [1,0,0] and gaps2 [0,0,1].
     *
     * If an element is not part of any group, it will stay being 'true', which
     * is the initial value. For example:
     * t1 = <img><p></p><br><canvas>, t2 = <b></b><br><canvas><img>
     *
     * The "<p></p>" and "<b></b>" do only show up in one of the two and will
     * therefore be marked by "true". The remaining parts are parts of the
     * groups 0 and 1:
     * gaps1 = [1, true, 0, 0], gaps2 = [true, 0, 0, 1]
     *
     */
    var getGapInformation = function getGapInformation(t1, t2, stable) {

        var gaps1 = t1.childNodes ? makeArray(t1.childNodes.length, true) : [],
            gaps2 = t2.childNodes ? makeArray(t2.childNodes.length, true) : [],
            group = 0;

        // give elements from the same subset the same group number
        stable.forEach(function (subset) {
            var i,
                endOld = subset.oldValue + subset.length,
                endNew = subset.newValue + subset.length;
            for (i = subset.oldValue; i < endOld; i += 1) {
                gaps1[i] = group;
            }
            for (i = subset.newValue; i < endNew; i += 1) {
                gaps2[i] = group;
            }
            group += 1;
        });

        return {
            gaps1: gaps1,
            gaps2: gaps2
        };
    };

    /**
     * Find all matching subsets, based on immediate child differences only.
     */
    var markSubTrees = function markSubTrees(oldTree, newTree) {
        // note: the child lists are views, and so update as we update old/newTree
        var oldChildren = oldTree.childNodes ? oldTree.childNodes : [],
            newChildren = newTree.childNodes ? newTree.childNodes : [],
            marked1 = makeArray(oldChildren.length, false),
            marked2 = makeArray(newChildren.length, false),
            subsets = [],
            subset = true,
            returnIndex = function returnIndex() {
            return arguments[1];
        },
            markBoth = function markBoth(i) {
            marked1[subset.oldValue + i] = true;
            marked2[subset.newValue + i] = true;
        };

        while (subset) {
            subset = findCommonSubsets(oldChildren, newChildren, marked1, marked2);
            if (subset) {
                subsets.push(subset);

                Array.apply(null, new Array(subset.length)).map(returnIndex).forEach(markBoth);
            }
        }
        return subsets;
    };

    function swap(obj, p1, p2) {
        (function (_) {
            obj[p1] = obj[p2];
            obj[p2] = _;
        })(obj[p1]);
    }

    var DiffTracker = function DiffTracker() {
        this.list = [];
    };

    DiffTracker.prototype = {
        list: false,
        add: function add(diffs) {
            var list = this.list;
            diffs.forEach(function (diff) {
                list.push(diff);
            });
        },
        forEach: function forEach(fn) {
            this.list.forEach(fn);
        }
    };

    var diffDOM = function diffDOM(options) {

        var defaults = {
            debug: false,
            diffcap: 10, // Limit for how many diffs are accepting when debugging. Inactive when debug is false.
            maxDepth: false, // False or a numeral. If set to a numeral, limits the level of depth that the the diff mechanism looks for differences. If false, goes through the entire tree.
            valueDiffing: true, // Whether to take into consideration the values of forms that differ from auto assigned values (when a user fills out a form).
            // syntax: textDiff: function (node, currentValue, expectedValue, newValue)
            textDiff: function textDiff() {
                arguments[0].data = arguments[3];
                return;
            },
            // empty functions were benchmarked as running faster than both
            // `f && f()` and `if (f) { f(); }`
            preVirtualDiffApply: function preVirtualDiffApply() {},
            postVirtualDiffApply: function postVirtualDiffApply() {},
            preDiffApply: function preDiffApply() {},
            postDiffApply: function postDiffApply() {},
            filterOuterDiff: null
        },
            i;

        if (typeof options === "undefined") {
            options = {};
        }

        for (i in defaults) {
            if (typeof options[i] === "undefined") {
                this[i] = defaults[i];
            } else {
                this[i] = options[i];
            }
        }

        this._const = {
            addAttribute: 0,
            modifyAttribute: 1,
            removeAttribute: 2,
            modifyTextElement: 3,
            relocateGroup: 4,
            removeElement: 5,
            addElement: 6,
            removeTextElement: 7,
            addTextElement: 8,
            replaceElement: 9,
            modifyValue: 10,
            modifyChecked: 11,
            modifySelected: 12,
            modifyComment: 13,
            action: 'a',
            route: 'r',
            oldValue: 'o',
            newValue: 'n',
            element: 'e',
            'group': 'g',
            from: 'f',
            to: 't',
            name: 'na',
            value: 'v',
            'data': 'd',
            'attributes': 'at',
            'nodeName': 'nn',
            'childNodes': 'c',
            'checked': 'ch',
            'selected': 's'
        };
    };

    diffDOM.Diff = Diff;

    diffDOM.prototype = {

        // ===== Create a diff =====

        diff: function diff(t1Node, t2Node) {

            var t1 = this.nodeToObj(t1Node),
                t2 = this.nodeToObj(t2Node);

            diffcount = 0;

            if (this.debug) {
                this.t1Orig = this.nodeToObj(t1Node);
                this.t2Orig = this.nodeToObj(t2Node);
            }

            this.tracker = new DiffTracker();
            return this.findDiffs(t1, t2);
        },
        findDiffs: function findDiffs(t1, t2) {
            var diffs;
            do {
                if (this.debug) {
                    diffcount += 1;
                    if (diffcount > this.diffcap) {
                        window.diffError = [this.t1Orig, this.t2Orig];
                        throw new Error("surpassed diffcap:" + JSON.stringify(this.t1Orig) + " -> " + JSON.stringify(this.t2Orig));
                    }
                }
                diffs = this.findNextDiff(t1, t2, []);
                if (diffs.length === 0) {
                    // Last check if the elements really are the same now.
                    // If not, remove all info about being done and start over.
                    // Somtimes a node can be marked as done, but the creation of subsequent diffs means that it has to be changed anyway.
                    if (!isEqual(t1, t2)) {
                        removeDone(t1);
                        diffs = this.findNextDiff(t1, t2, []);
                    }
                }

                if (diffs.length > 0) {
                    this.tracker.add(diffs);
                    this.applyVirtual(t1, diffs);
                }
            } while (diffs.length > 0);
            return this.tracker.list;
        },
        findNextDiff: function findNextDiff(t1, t2, route) {
            var diffs, fdiffs;

            if (this.maxDepth && route.length > this.maxDepth) {
                return [];
            }
            // outer differences?
            if (!t1.outerDone) {
                diffs = this.findOuterDiff(t1, t2, route);
                if (this.filterOuterDiff) {
                    fdiffs = this.filterOuterDiff(t1, t2, diffs);
                    if (fdiffs) diffs = fdiffs;
                }
                if (diffs.length > 0) {
                    t1.outerDone = true;
                    return diffs;
                } else {
                    t1.outerDone = true;
                }
            }
            // inner differences?
            if (!t1.innerDone) {
                diffs = this.findInnerDiff(t1, t2, route);
                if (diffs.length > 0) {
                    return diffs;
                } else {
                    t1.innerDone = true;
                }
            }

            if (this.valueDiffing && !t1.valueDone) {
                // value differences?
                diffs = this.findValueDiff(t1, t2, route);

                if (diffs.length > 0) {
                    t1.valueDone = true;
                    return diffs;
                } else {
                    t1.valueDone = true;
                }
            }

            // no differences
            return [];
        },
        findOuterDiff: function findOuterDiff(t1, t2, route) {
            var t = this;
            var diffs = [],
                attr1,
                attr2;

            if (t1.nodeName !== t2.nodeName) {
                return [new Diff().setValue(t._const.action, t._const.replaceElement).setValue(t._const.oldValue, cloneObj(t1)).setValue(t._const.newValue, cloneObj(t2)).setValue(t._const.route, route)];
            }

            if (t1.data !== t2.data) {
                // Comment or text node.
                if (t1.nodeName === '#text') {
                    return [new Diff().setValue(t._const.action, t._const.modifyTextElement).setValue(t._const.route, route).setValue(t._const.oldValue, t1.data).setValue(t._const.newValue, t2.data)];
                } else {
                    return [new Diff().setValue(t._const.action, t._const.modifyComment).setValue(t._const.route, route).setValue(t._const.oldValue, t1.data).setValue(t._const.newValue, t2.data)];
                }
            }

            attr1 = t1.attributes ? Object.keys(t1.attributes).sort() : [];
            attr2 = t2.attributes ? Object.keys(t2.attributes).sort() : [];

            attr1.forEach(function (attr) {
                var pos = attr2.indexOf(attr);
                if (pos === -1) {
                    diffs.push(new Diff().setValue(t._const.action, t._const.removeAttribute).setValue(t._const.route, route).setValue(t._const.name, attr).setValue(t._const.value, t1.attributes[attr]));
                } else {
                    attr2.splice(pos, 1);
                    if (t1.attributes[attr] !== t2.attributes[attr]) {
                        diffs.push(new Diff().setValue(t._const.action, t._const.modifyAttribute).setValue(t._const.route, route).setValue(t._const.name, attr).setValue(t._const.oldValue, t1.attributes[attr]).setValue(t._const.newValue, t2.attributes[attr]));
                    }
                }
            });

            attr2.forEach(function (attr) {
                diffs.push(new Diff().setValue(t._const.action, t._const.addAttribute).setValue(t._const.route, route).setValue(t._const.name, attr).setValue(t._const.value, t2.attributes[attr]));
            });

            return diffs;
        },
        nodeToObj: function nodeToObj(aNode) {
            var objNode = {},
                dobj = this;
            objNode.nodeName = aNode.nodeName;
            if (objNode.nodeName === '#text' || objNode.nodeName === '#comment') {
                objNode.data = aNode.data;
            } else {
                if (aNode.attributes && aNode.attributes.length > 0) {
                    objNode.attributes = {};
                    Array.prototype.slice.call(aNode.attributes).forEach(function (attribute) {
                        objNode.attributes[attribute.name] = attribute.value;
                    });
                }
                if (aNode.childNodes && aNode.childNodes.length > 0) {
                    objNode.childNodes = [];
                    Array.prototype.slice.call(aNode.childNodes).forEach(function (childNode) {
                        objNode.childNodes.push(dobj.nodeToObj(childNode));
                    });
                }
                if (this.valueDiffing) {
                    if (aNode.value !== undefined) {
                        objNode.value = aNode.value;
                    }
                    if (aNode.checked !== undefined) {
                        objNode.checked = aNode.checked;
                    }
                    if (aNode.selected !== undefined) {
                        objNode.selected = aNode.selected;
                    }
                }
            }

            return objNode;
        },
        objToNode: function objToNode(objNode, insideSvg) {
            var node,
                dobj = this;
            if (objNode.nodeName === '#text') {
                node = document.createTextNode(objNode.data);
            } else if (objNode.nodeName === '#comment') {
                node = document.createComment(objNode.data);
            } else {
                if (objNode.nodeName === 'svg' || insideSvg) {
                    node = document.createElementNS('http://www.w3.org/2000/svg', objNode.nodeName);
                    insideSvg = true;
                } else {
                    node = document.createElement(objNode.nodeName);
                }
                if (objNode.attributes) {
                    Object.keys(objNode.attributes).forEach(function (attribute) {
                        node.setAttribute(attribute, objNode.attributes[attribute]);
                    });
                }
                if (objNode.childNodes) {
                    objNode.childNodes.forEach(function (childNode) {
                        node.appendChild(dobj.objToNode(childNode, insideSvg));
                    });
                }
                if (this.valueDiffing) {
                    if (objNode.value) {
                        node.value = objNode.value;
                    }
                    if (objNode.checked) {
                        node.checked = objNode.checked;
                    }
                    if (objNode.selected) {
                        node.selected = objNode.selected;
                    }
                }
            }
            return node;
        },
        findInnerDiff: function findInnerDiff(t1, t2, route) {
            var t = this;
            var subtrees = t1.childNodes && t2.childNodes ? markSubTrees(t1, t2) : [],
                t1ChildNodes = t1.childNodes ? t1.childNodes : [],
                t2ChildNodes = t2.childNodes ? t2.childNodes : [],
                childNodesLengthDifference,
                diffs = [],
                index = 0,
                last,
                e1,
                e2,
                i;

            if (subtrees.length > 0) {
                /* One or more groups have been identified among the childnodes of t1
                 * and t2.
                 */
                diffs = this.attemptGroupRelocation(t1, t2, subtrees, route);
                if (diffs.length > 0) {
                    return diffs;
                }
            }

            /* 0 or 1 groups of similar child nodes have been found
             * for t1 and t2. 1 If there is 1, it could be a sign that the
             * contents are the same. When the number of groups is below 2,
             * t1 and t2 are made to have the same length and each of the
             * pairs of child nodes are diffed.
             */

            last = Math.max(t1ChildNodes.length, t2ChildNodes.length);
            if (t1ChildNodes.length !== t2ChildNodes.length) {
                childNodesLengthDifference = true;
            }

            for (i = 0; i < last; i += 1) {
                e1 = t1ChildNodes[i];
                e2 = t2ChildNodes[i];

                if (childNodesLengthDifference) {
                    /* t1 and t2 have different amounts of childNodes. Add
                     * and remove as necessary to obtain the same length */
                    if (e1 && !e2) {
                        if (e1.nodeName === '#text') {
                            diffs.push(new Diff().setValue(t._const.action, t._const.removeTextElement).setValue(t._const.route, route.concat(index)).setValue(t._const.value, e1.data));
                            index -= 1;
                        } else {
                            diffs.push(new Diff().setValue(t._const.action, t._const.removeElement).setValue(t._const.route, route.concat(index)).setValue(t._const.element, cloneObj(e1)));
                            index -= 1;
                        }
                    } else if (e2 && !e1) {
                        if (e2.nodeName === '#text') {
                            diffs.push(new Diff().setValue(t._const.action, t._const.addTextElement).setValue(t._const.route, route.concat(index)).setValue(t._const.value, e2.data));
                        } else {
                            diffs.push(new Diff().setValue(t._const.action, t._const.addElement).setValue(t._const.route, route.concat(index)).setValue(t._const.element, cloneObj(e2)));
                        }
                    }
                }
                /* We are now guaranteed that childNodes e1 and e2 exist,
                 * and that they can be diffed.
                 */
                /* Diffs in child nodes should not affect the parent node,
                 * so we let these diffs be submitted together with other
                 * diffs.
                 */

                if (e1 && e2) {
                    diffs = diffs.concat(this.findNextDiff(e1, e2, route.concat(index)));
                }

                index += 1;
            }
            t1.innerDone = true;
            return diffs;
        },

        attemptGroupRelocation: function attemptGroupRelocation(t1, t2, subtrees, route) {
            /* Either t1.childNodes and t2.childNodes have the same length, or
             * there are at least two groups of similar elements can be found.
             * attempts are made at equalizing t1 with t2. First all initial
             * elements with no group affiliation (gaps=true) are removed (if
             * only in t1) or added (if only in t2). Then the creation of a group
             * relocation diff is attempted.
             */
            var t = this;
            var gapInformation = getGapInformation(t1, t2, subtrees),
                gaps1 = gapInformation.gaps1,
                gaps2 = gapInformation.gaps2,
                shortest = Math.min(gaps1.length, gaps2.length),
                destinationDifferent,
                toGroup,
                group,
                node,
                similarNode,
                testI,
                diffs = [],
                index1,
                index2,
                j;

            for (index2 = 0, index1 = 0; index2 < shortest; index1 += 1, index2 += 1) {
                if (gaps1[index2] === true) {
                    node = t1.childNodes[index1];
                    if (node.nodeName === '#text') {
                        if (t2.childNodes[index2].nodeName === '#text' && node.data !== t2.childNodes[index2].data) {
                            testI = index1;
                            while (t1.childNodes.length > testI + 1 && t1.childNodes[testI + 1].nodeName === '#text') {
                                testI += 1;
                                if (t2.childNodes[index2].data === t1.childNodes[testI].data) {
                                    similarNode = true;
                                    break;
                                }
                            }
                            if (!similarNode) {
                                diffs.push(new Diff().setValue(t._const.action, t._const.modifyTextElement).setValue(t._const.route, route.concat(index2)).setValue(t._const.oldValue, node.data).setValue(t._const.newValue, t2.childNodes[index2].data));
                                return diffs;
                            }
                        }
                        diffs.push(new Diff().setValue(t._const.action, t._const.removeTextElement).setValue(t._const.route, route.concat(index2)).setValue(t._const.value, node.data));
                        gaps1.splice(index2, 1);
                        shortest = Math.min(gaps1.length, gaps2.length);
                        index2 -= 1;
                    } else {
                        diffs.push(new Diff().setValue(t._const.action, t._const.removeElement).setValue(t._const.route, route.concat(index2)).setValue(t._const.element, cloneObj(node)));
                        gaps1.splice(index2, 1);
                        shortest = Math.min(gaps1.length, gaps2.length);
                        index2 -= 1;
                    }
                } else if (gaps2[index2] === true) {
                    node = t2.childNodes[index2];
                    if (node.nodeName === '#text') {
                        diffs.push(new Diff().setValue(t._const.action, t._const.addTextElement).setValue(t._const.route, route.concat(index2)).setValue(t._const.value, node.data));
                        gaps1.splice(index2, 0, true);
                        shortest = Math.min(gaps1.length, gaps2.length);
                        index1 -= 1;
                    } else {
                        diffs.push(new Diff().setValue(t._const.action, t._const.addElement).setValue(t._const.route, route.concat(index2)).setValue(t._const.element, cloneObj(node)));
                        gaps1.splice(index2, 0, true);
                        shortest = Math.min(gaps1.length, gaps2.length);
                        index1 -= 1;
                    }
                } else if (gaps1[index2] !== gaps2[index2]) {
                    if (diffs.length > 0) {
                        return diffs;
                    }
                    // group relocation
                    group = subtrees[gaps1[index2]];
                    toGroup = Math.min(group.newValue, t1.childNodes.length - group.length);
                    if (toGroup !== group.oldValue) {
                        // Check whether destination nodes are different than originating ones.
                        destinationDifferent = false;
                        for (j = 0; j < group.length; j += 1) {
                            if (!roughlyEqual(t1.childNodes[toGroup + j], t1.childNodes[group.oldValue + j], [], false, true)) {
                                destinationDifferent = true;
                            }
                        }
                        if (destinationDifferent) {
                            return [new Diff().setValue(t._const.action, t._const.relocateGroup).setValue('groupLength', group.length).setValue(t._const.from, group.oldValue).setValue(t._const.to, toGroup).setValue(t._const.route, route)];
                        }
                    }
                }
            }
            return diffs;
        },

        findValueDiff: function findValueDiff(t1, t2, route) {
            // Differences of value. Only useful if the value/selection/checked value
            // differs from what is represented in the DOM. For example in the case
            // of filled out forms, etc.
            var diffs = [];
            var t = this;

            if (t1.selected !== t2.selected) {
                diffs.push(new Diff().setValue(t._const.action, t._const.modifySelected).setValue(t._const.oldValue, t1.selected).setValue(t._const.newValue, t2.selected).setValue(t._const.route, route));
            }

            if ((t1.value || t2.value) && t1.value !== t2.value && t1.nodeName !== 'OPTION') {
                diffs.push(new Diff().setValue(t._const.action, t._const.modifyValue).setValue(t._const.oldValue, t1.value).setValue(t._const.newValue, t2.value).setValue(t._const.route, route));
            }
            if (t1.checked !== t2.checked) {
                diffs.push(new Diff().setValue(t._const.action, t._const.modifyChecked).setValue(t._const.oldValue, t1.checked).setValue(t._const.newValue, t2.checked).setValue(t._const.route, route));
            }

            return diffs;
        },

        // ===== Apply a virtual diff =====

        applyVirtual: function applyVirtual(tree, diffs) {
            var dobj = this;
            if (diffs.length === 0) {
                return true;
            }
            diffs.forEach(function (diff) {
                dobj.applyVirtualDiff(tree, diff);
            });
            return true;
        },
        getFromVirtualRoute: function getFromVirtualRoute(tree, route) {
            var node = tree,
                parentNode,
                nodeIndex;

            route = route.slice();
            while (route.length > 0) {
                if (!node.childNodes) {
                    return false;
                }
                nodeIndex = route.splice(0, 1)[0];
                parentNode = node;
                node = node.childNodes[nodeIndex];
            }
            return {
                node: node,
                parentNode: parentNode,
                nodeIndex: nodeIndex
            };
        },
        applyVirtualDiff: function applyVirtualDiff(tree, diff) {
            var routeInfo = this.getFromVirtualRoute(tree, diff[this._const.route]),
                node = routeInfo.node,
                parentNode = routeInfo.parentNode,
                nodeIndex = routeInfo.nodeIndex,
                newNode,
                route,
                c;

            var t = this;
            // pre-diff hook
            var info = {
                diff: diff,
                node: node
            };

            if (this.preVirtualDiffApply(info)) {
                return true;
            }

            switch (diff[this._const.action]) {
                case this._const.addAttribute:
                    if (!node.attributes) {
                        node.attributes = {};
                    }

                    node.attributes[diff[this._const.name]] = diff[this._const.value];

                    if (diff[this._const.name] === 'checked') {
                        node.checked = true;
                    } else if (diff[this._const.name] === 'selected') {
                        node.selected = true;
                    } else if (node.nodeName === 'INPUT' && diff[this._const.name] === 'value') {
                        node.value = diff[this._const.value];
                    }

                    break;
                case this._const.modifyAttribute:
                    node.attributes[diff[this._const.name]] = diff[this._const.newValue];
                    if (node.nodeName === 'INPUT' && diff[this._const.name] === 'value') {
                        node.value = diff[this._const.value];
                    }
                    break;
                case this._const.removeAttribute:

                    delete node.attributes[diff[this._const.name]];

                    if (Object.keys(node.attributes).length === 0) {
                        delete node.attributes;
                    }

                    if (diff[this._const.name] === 'checked') {
                        node.checked = false;
                    } else if (diff[this._const.name] === 'selected') {
                        delete node.selected;
                    } else if (node.nodeName === 'INPUT' && diff[this._const.name] === 'value') {
                        delete node.value;
                    }

                    break;
                case this._const.modifyTextElement:
                    node.data = diff[this._const.newValue];

                    if (parentNode.nodeName === 'TEXTAREA') {
                        parentNode.value = diff[this._const.newValue];
                    }
                    break;
                case this._const.modifyValue:
                    node.value = diff[this._const.newValue];
                    break;
                case this._const.modifyComment:
                    node.data = diff[this._const.newValue];
                    break;
                case this._const.modifyChecked:
                    node.checked = diff[this._const.newValue];
                    break;
                case this._const.modifySelected:
                    node.selected = diff[this._const.newValue];
                    break;
                case this._const.replaceElement:
                    newNode = cloneObj(diff[this._const.newValue]);
                    newNode.outerDone = true;
                    newNode.innerDone = true;
                    newNode.valueDone = true;
                    parentNode.childNodes[nodeIndex] = newNode;
                    break;
                case this._const.relocateGroup:
                    node.childNodes.splice(diff[this._const.from], diff.groupLength).reverse().forEach(function (movedNode) {
                        node.childNodes.splice(diff[t._const.to], 0, movedNode);
                    });
                    break;
                case this._const.removeElement:
                    parentNode.childNodes.splice(nodeIndex, 1);
                    break;
                case this._const.addElement:
                    route = diff[this._const.route].slice();
                    c = route.splice(route.length - 1, 1)[0];
                    node = this.getFromVirtualRoute(tree, route).node;
                    newNode = cloneObj(diff[this._const.element]);
                    newNode.outerDone = true;
                    newNode.innerDone = true;
                    newNode.valueDone = true;

                    if (!node.childNodes) {
                        node.childNodes = [];
                    }

                    if (c >= node.childNodes.length) {
                        node.childNodes.push(newNode);
                    } else {
                        node.childNodes.splice(c, 0, newNode);
                    }
                    break;
                case this._const.removeTextElement:
                    parentNode.childNodes.splice(nodeIndex, 1);
                    if (parentNode.nodeName === 'TEXTAREA') {
                        delete parentNode.value;
                    }
                    break;
                case this._const.addTextElement:
                    route = diff[this._const.route].slice();
                    c = route.splice(route.length - 1, 1)[0];
                    newNode = {};
                    newNode.nodeName = '#text';
                    newNode.data = diff[this._const.value];
                    node = this.getFromVirtualRoute(tree, route).node;
                    if (!node.childNodes) {
                        node.childNodes = [];
                    }

                    if (c >= node.childNodes.length) {
                        node.childNodes.push(newNode);
                    } else {
                        node.childNodes.splice(c, 0, newNode);
                    }
                    if (node.nodeName === 'TEXTAREA') {
                        node.value = diff[this._const.newValue];
                    }
                    break;
                default:
                    console.log('unknown action');
            }

            // capture newNode for the callback
            info.newNode = newNode;
            this.postVirtualDiffApply(info);

            return;
        },

        // ===== Apply a diff =====

        apply: function apply(tree, diffs) {
            var dobj = this;

            if (diffs.length === 0) {
                return true;
            }
            diffs.forEach(function (diff) {
                if (!dobj.applyDiff(tree, diff)) {
                    return false;
                }
            });
            return true;
        },
        getFromRoute: function getFromRoute(tree, route) {
            route = route.slice();
            var c,
                node = tree;
            while (route.length > 0) {
                if (!node.childNodes) {
                    return false;
                }
                c = route.splice(0, 1)[0];
                node = node.childNodes[c];
            }
            return node;
        },
        applyDiff: function applyDiff(tree, diff) {
            var node = this.getFromRoute(tree, diff[this._const.route]),
                newNode,
                reference,
                route,
                c;

            var t = this;
            // pre-diff hook
            var info = {
                diff: diff,
                node: node
            };

            if (this.preDiffApply(info)) {
                return true;
            }

            switch (diff[this._const.action]) {
                case this._const.addAttribute:
                    if (!node || !node.setAttribute) {
                        return false;
                    }
                    node.setAttribute(diff[this._const.name], diff[this._const.value]);
                    break;
                case this._const.modifyAttribute:
                    if (!node || !node.setAttribute) {
                        return false;
                    }
                    node.setAttribute(diff[this._const.name], diff[this._const.newValue]);
                    break;
                case this._const.removeAttribute:
                    if (!node || !node.removeAttribute) {
                        return false;
                    }
                    node.removeAttribute(diff[this._const.name]);
                    break;
                case this._const.modifyTextElement:
                    if (!node || node.nodeType !== 3) {
                        return false;
                    }
                    this.textDiff(node, node.data, diff[this._const.oldValue], diff[this._const.newValue]);
                    break;
                case this._const.modifyValue:
                    if (!node || typeof node.value === 'undefined') {
                        return false;
                    }
                    node.value = diff[this._const.newValue];
                    break;
                case this._const.modifyComment:
                    if (!node || typeof node.data === 'undefined') {
                        return false;
                    }
                    this.textDiff(node, node.data, diff[this._const.oldValue], diff[this._const.newValue]);
                    break;
                case this._const.modifyChecked:
                    if (!node || typeof node.checked === 'undefined') {
                        return false;
                    }
                    node.checked = diff[this._const.newValue];
                    break;
                case this._const.modifySelected:
                    if (!node || typeof node.selected === 'undefined') {
                        return false;
                    }
                    node.selected = diff[this._const.newValue];
                    break;
                case this._const.replaceElement:
                    node.parentNode.replaceChild(this.objToNode(diff[this._const.newValue], node.namespaceURI === 'http://www.w3.org/2000/svg'), node);
                    break;
                case this._const.relocateGroup:
                    Array.apply(null, new Array(diff.groupLength)).map(function () {
                        return node.removeChild(node.childNodes[diff[t._const.from]]);
                    }).forEach(function (childNode, index) {
                        if (index === 0) {
                            reference = node.childNodes[diff[t._const.to]];
                        }
                        node.insertBefore(childNode, reference);
                    });
                    break;
                case this._const.removeElement:
                    node.parentNode.removeChild(node);
                    break;
                case this._const.addElement:
                    route = diff[this._const.route].slice();
                    c = route.splice(route.length - 1, 1)[0];
                    node = this.getFromRoute(tree, route);
                    node.insertBefore(this.objToNode(diff[this._const.element], node.namespaceURI === 'http://www.w3.org/2000/svg'), node.childNodes[c]);
                    break;
                case this._const.removeTextElement:
                    if (!node || node.nodeType !== 3) {
                        return false;
                    }
                    node.parentNode.removeChild(node);
                    break;
                case this._const.addTextElement:
                    route = diff[this._const.route].slice();
                    c = route.splice(route.length - 1, 1)[0];
                    newNode = document.createTextNode(diff[this._const.value]);
                    node = this.getFromRoute(tree, route);
                    if (!node || !node.childNodes) {
                        return false;
                    }
                    node.insertBefore(newNode, node.childNodes[c]);
                    break;
                default:
                    console.log('unknown action');
            }

            // if a new node was created, we might be interested in it
            // post diff hook
            info.newNode = newNode;
            this.postDiffApply(info);

            return true;
        },

        // ===== Undo a diff =====

        undo: function undo(tree, diffs) {
            diffs = diffs.slice();
            var dobj = this;
            if (!diffs.length) {
                diffs = [diffs];
            }
            diffs.reverse();
            diffs.forEach(function (diff) {
                dobj.undoDiff(tree, diff);
            });
        },
        undoDiff: function undoDiff(tree, diff) {

            switch (diff[this._const.action]) {
                case this._const.addAttribute:
                    diff[this._const.action] = this._const.removeAttribute;
                    this.applyDiff(tree, diff);
                    break;
                case this._const.modifyAttribute:
                    swap(diff, this._const.oldValue, this._const.newValue);
                    this.applyDiff(tree, diff);
                    break;
                case this._const.removeAttribute:
                    diff[this._const.action] = this._const.addAttribute;
                    this.applyDiff(tree, diff);
                    break;
                case this._const.modifyTextElement:
                    swap(diff, this._const.oldValue, this._const.newValue);
                    this.applyDiff(tree, diff);
                    break;
                case this._const.modifyValue:
                    swap(diff, this._const.oldValue, this._const.newValue);
                    this.applyDiff(tree, diff);
                    break;
                case this._const.modifyComment:
                    swap(diff, this._const.oldValue, this._const.newValue);
                    this.applyDiff(tree, diff);
                    break;
                case this._const.modifyChecked:
                    swap(diff, this._const.oldValue, this._const.newValue);
                    this.applyDiff(tree, diff);
                    break;
                case this._const.modifySelected:
                    swap(diff, this._const.oldValue, this._const.newValue);
                    this.applyDiff(tree, diff);
                    break;
                case this._const.replaceElement:
                    swap(diff, this._const.oldValue, this._const.newValue);
                    this.applyDiff(tree, diff);
                    break;
                case this._const.relocateGroup:
                    swap(diff, this._const.from, this._const.to);
                    this.applyDiff(tree, diff);
                    break;
                case this._const.removeElement:
                    diff[this._const.action] = this._const.addElement;
                    this.applyDiff(tree, diff);
                    break;
                case this._const.addElement:
                    diff[this._const.action] = this._const.removeElement;
                    this.applyDiff(tree, diff);
                    break;
                case this._const.removeTextElement:
                    diff[this._const.action] = this._const.addTextElement;
                    this.applyDiff(tree, diff);
                    break;
                case this._const.addTextElement:
                    diff[this._const.action] = this._const.removeTextElement;
                    this.applyDiff(tree, diff);
                    break;
                default:
                    console.log('unknown action');
            }
        }
    };

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = diffDOM;
        }
        exports.diffDOM = diffDOM;
    } else {
        // `window` in the browser, or `exports` on the server
        this.diffDOM = diffDOM;
    }
}).call(window);

},{}],4:[function(require,module,exports){
'use strict';

require('./diffDOM/diffDOM');

require('./common');

require('./client');

},{"./client":1,"./common":2,"./diffDOM/diffDOM":3}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

// Modules are passed from each frame that needs it via getEmbeddedInternalScript

exports.default = function (config) {
  var chapterId = config.chapterId,
      document = config.document,
      modules = config.modules;


  var moduleConfig = {
    document: document,
    chapterId: chapterId
  };

  modules.forEach(function (module) {
    new Function("moduleConfig", module).call(undefined, moduleConfig);
  });
};

},{}],6:[function(require,module,exports){
(function (global){
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/**
 * @license
 * Lodash (Custom Build) lodash.com/license | Underscore.js 1.8.3 underscorejs.org/LICENSE
 * Build: `lodash include="isEqual"`
 */
;(function () {
  function t(t, e) {
    for (var r = -1, n = null == t ? 0 : t.length, o = 0, a = []; ++r < n;) {
      var i = t[r];e(i, r, t) && (a[o++] = i);
    }return a;
  }function e(t, e) {
    for (var r = -1, n = null == t ? 0 : t.length; ++r < n;) {
      if (e(t[r], r, t)) return true;
    }return false;
  }function r(t) {
    return function (e) {
      return t(e);
    };
  }function n(t) {
    var e = -1,
        r = Array(t.size);return t.forEach(function (t, n) {
      r[++e] = [n, t];
    }), r;
  }function o(t) {
    var e = -1,
        r = Array(t.size);return t.forEach(function (t) {
      r[++e] = t;
    }), r;
  }function a() {}function i(t) {
    var e = -1,
        r = null == t ? 0 : t.length;for (this.clear(); ++e < r;) {
      var n = t[e];this.set(n[0], n[1]);
    }
  }function c(t) {
    var e = -1,
        r = null == t ? 0 : t.length;for (this.clear(); ++e < r;) {
      var n = t[e];this.set(n[0], n[1]);
    }
  }function s(t) {
    var e = -1,
        r = null == t ? 0 : t.length;for (this.clear(); ++e < r;) {
      var n = t[e];this.set(n[0], n[1]);
    }
  }function u(t) {
    var e = -1,
        r = null == t ? 0 : t.length;for (this.__data__ = new s(); ++e < r;) {
      this.add(t[e]);
    }
  }function f(t) {
    this.size = (this.__data__ = new c(t)).size;
  }function l(t, e) {
    for (var r = t.length; r--;) {
      if (m(t[r][0], e)) return r;
    }return -1;
  }function _(t, e, r) {
    if (e = e(t), !pt(t)) {
      t = r(t), r = -1;for (var n = t.length, o = e.length; ++r < n;) {
        e[o + r] = t[r];
      }
    }return e;
  }function b(t) {
    if (null == t) t = t === M ? "[object Undefined]" : "[object Null]";else if (Y && Y in Object(t)) {
      var e = q.call(t, Y),
          r = t[Y];try {
        t[Y] = M;var n = true;
      } catch (t) {}var o = G.call(t);n && (e ? t[Y] = r : delete t[Y]), t = o;
    } else t = G.call(t);return t;
  }function h(t) {
    return S(t) && "[object Arguments]" == b(t);
  }function p(t, e, r, n, o) {
    if (t === e) e = true;else if (null == t || null == e || !S(t) && !S(e)) e = t !== t && e !== e;else t: {
      var a = pt(t),
          i = pt(e),
          c = a ? "[object Array]" : bt(t),
          s = i ? "[object Array]" : bt(e),
          c = "[object Arguments]" == c ? "[object Object]" : c,
          s = "[object Arguments]" == s ? "[object Object]" : s,
          u = "[object Object]" == c,
          i = "[object Object]" == s;
      if ((s = c == s) && yt(t)) {
        if (!yt(e)) {
          e = false;break t;
        }a = true, u = false;
      }if (s && !u) o || (o = new f()), e = a || jt(t) ? j(t, e, r, n, p, o) : d(t, e, c, r, n, p, o);else {
        if (!(1 & r) && (a = u && q.call(t, "__wrapped__"), c = i && q.call(e, "__wrapped__"), a || c)) {
          t = a ? t.value() : t, e = c ? e.value() : e, o || (o = new f()), e = p(t, e, r, n, o);break t;
        }if (s) {
          e: if (o || (o = new f()), a = 1 & r, c = _(t, x, _t), i = c.length, s = _(e, x, _t).length, i == s || a) {
            for (u = i; u--;) {
              var l = c[u];if (!(a ? l in e : q.call(e, l))) {
                e = false;break e;
              }
            }if ((s = o.get(t)) && o.get(e)) e = s == e;else {
              s = true, o.set(t, e), o.set(e, t);for (var b = a; ++u < i;) {
                var l = c[u],
                    h = t[l],
                    y = e[l];if (n) var g = a ? n(y, h, l, e, t, o) : n(h, y, l, t, e, o);if (g === M ? h !== y && !p(h, y, r, n, o) : !g) {
                  s = false;break;
                }b || (b = "constructor" == l);
              }s && !b && (r = t.constructor, n = e.constructor, r != n && "constructor" in t && "constructor" in e && !(typeof r == "function" && r instanceof r && typeof n == "function" && n instanceof n) && (s = false)), o.delete(t), o.delete(e), e = s;
            }
          } else e = false;
        } else e = false;
      }
    }return e;
  }function y(t) {
    return S(t) && z(t.length) && !!P[b(t)];
  }function j(t, r, n, o, a, i) {
    var c = 1 & n,
        s = t.length,
        f = r.length;if (s != f && !(c && f > s)) return false;if ((f = i.get(t)) && i.get(r)) return f == r;
    var f = -1,
        l = true,
        _ = 2 & n ? new u() : M;for (i.set(t, r), i.set(r, t); ++f < s;) {
      var b = t[f],
          h = r[f];if (o) var p = c ? o(h, b, f, r, t, i) : o(b, h, f, t, r, i);if (p !== M) {
        if (p) continue;l = false;break;
      }if (_) {
        if (!e(r, function (t, e) {
          if (!_.has(e) && (b === t || a(b, t, n, o, i))) return _.push(e);
        })) {
          l = false;break;
        }
      } else if (b !== h && !a(b, h, n, o, i)) {
        l = false;break;
      }
    }return i.delete(t), i.delete(r), l;
  }function d(t, e, r, a, i, c, s) {
    switch (r) {case "[object DataView]":
        if (t.byteLength != e.byteLength || t.byteOffset != e.byteOffset) break;t = t.buffer, e = e.buffer;case "[object ArrayBuffer]":
        if (t.byteLength != e.byteLength || !c(new K(t), new K(e))) break;return true;case "[object Boolean]":case "[object Date]":case "[object Number]":
        return m(+t, +e);case "[object Error]":
        return t.name == e.name && t.message == e.message;case "[object RegExp]":case "[object String]":
        return t == e + "";case "[object Map]":
        var u = n;case "[object Set]":
        if (u || (u = o), t.size != e.size && !(1 & a)) break;return (r = s.get(t)) ? r == e : (a |= 2, s.set(t, e), e = j(u(t), u(e), a, i, c, s), s.delete(t), e);case "[object Symbol]":
        if (lt) return lt.call(t) == lt.call(e);}return false;
  }function g(t, e) {
    var r = t.__data__,
        n = typeof e === "undefined" ? "undefined" : _typeof(e);return ("string" == n || "number" == n || "symbol" == n || "boolean" == n ? "__proto__" !== e : null === e) ? r[typeof e == "string" ? "string" : "hash"] : r.map;
  }function v(t, e) {
    var r = null == t ? M : t[e];return (!k(r) || C && C in r ? 0 : (O(r) ? H : B).test(A(r))) ? r : M;
  }function A(t) {
    if (null != t) {
      try {
        return W.call(t);
      } catch (t) {}return t + "";
    }return "";
  }function m(t, e) {
    return t === e || t !== t && e !== e;
  }function w(t) {
    return null != t && z(t.length) && !O(t);
  }function O(t) {
    return !!k(t) && (t = b(t), "[object Function]" == t || "[object GeneratorFunction]" == t || "[object AsyncFunction]" == t || "[object Proxy]" == t);
  }function z(t) {
    return typeof t == "number" && -1 < t && 0 == t % 1 && 9007199254740991 >= t;
  }function k(t) {
    var e = typeof t === "undefined" ? "undefined" : _typeof(t);return null != t && ("object" == e || "function" == e);
  }function S(t) {
    return null != t && (typeof t === "undefined" ? "undefined" : _typeof(t)) == "object";
  }function x(t) {
    if (w(t)) {
      var e = pt(t),
          r = !e && ht(t),
          n = !e && !r && yt(t),
          o = !e && !r && !n && jt(t);if (e = e || r || n || o) {
        for (var r = t.length, a = String, i = -1, c = Array(r); ++i < r;) {
          c[i] = a(i);
        }r = c;
      } else r = [];var s,
          a = r.length;for (s in t) {
        (i = !q.call(t, s)) || !(i = e) || (i = "length" == s || n && ("offset" == s || "parent" == s) || o && ("buffer" == s || "byteLength" == s || "byteOffset" == s)) || (i = s, c = a, c = null == c ? 9007199254740991 : c, i = !!c && (typeof i == "number" || L.test(i)) && -1 < i && 0 == i % 1 && i < c), i || r.push(s);
      }t = r;
    } else if (s = t && t.constructor, t === (typeof s == "function" && s.prototype || R)) {
      s = [];for (n in Object(t)) {
        q.call(t, n) && "constructor" != n && s.push(n);
      }t = s;
    } else t = tt(t);return t;
  }function E() {
    return [];
  }function F() {
    return false;
  }var M,
      B = /^\[object .+?Constructor\]$/,
      L = /^(?:0|[1-9]\d*)$/,
      P = {};P["[object Float32Array]"] = P["[object Float64Array]"] = P["[object Int8Array]"] = P["[object Int16Array]"] = P["[object Int32Array]"] = P["[object Uint8Array]"] = P["[object Uint8ClampedArray]"] = P["[object Uint16Array]"] = P["[object Uint32Array]"] = true, P["[object Arguments]"] = P["[object Array]"] = P["[object ArrayBuffer]"] = P["[object Boolean]"] = P["[object DataView]"] = P["[object Date]"] = P["[object Error]"] = P["[object Function]"] = P["[object Map]"] = P["[object Number]"] = P["[object Object]"] = P["[object RegExp]"] = P["[object Set]"] = P["[object String]"] = P["[object WeakMap]"] = false;var D,
      $ = (typeof global === "undefined" ? "undefined" : _typeof(global)) == "object" && global && global.Object === Object && global,
      I = (typeof self === "undefined" ? "undefined" : _typeof(self)) == "object" && self && self.Object === Object && self,
      I = $ || I || Function("return this")(),
      T = (typeof exports === "undefined" ? "undefined" : _typeof(exports)) == "object" && exports && !exports.nodeType && exports,
      U = T && (typeof module === "undefined" ? "undefined" : _typeof(module)) == "object" && module && !module.nodeType && module,
      V = U && U.exports === T,
      $ = V && $.process;
  t: {
    try {
      D = $ && $.binding && $.binding("util");break t;
    } catch (t) {}D = void 0;
  }D = D && D.isTypedArray;var $ = Array.prototype,
      R = Object.prototype,
      N = I["__core-js_shared__"],
      W = Function.prototype.toString,
      q = R.hasOwnProperty,
      C = function () {
    var t = /[^.]+$/.exec(N && N.keys && N.keys.IE_PROTO || "");return t ? "Symbol(src)_1." + t : "";
  }(),
      G = R.toString,
      H = RegExp("^" + W.call(q).replace(/[\\^$.*+?()[\]{}|]/g, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"),
      J = V ? I.Buffer : M,
      V = I.Symbol,
      K = I.Uint8Array,
      Q = R.propertyIsEnumerable,
      X = $.splice,
      Y = V ? V.toStringTag : M,
      Z = Object.getOwnPropertySymbols,
      $ = J ? J.isBuffer : M,
      tt = function (t, e) {
    return function (r) {
      return t(e(r));
    };
  }(Object.keys, Object),
      J = v(I, "DataView"),
      et = v(I, "Map"),
      rt = v(I, "Promise"),
      nt = v(I, "Set"),
      ot = v(I, "WeakMap"),
      at = v(Object, "create"),
      it = A(J),
      ct = A(et),
      st = A(rt),
      ut = A(nt),
      ft = A(ot),
      lt = (V = V ? V.prototype : M) ? V.valueOf : M;i.prototype.clear = function () {
    this.__data__ = at ? at(null) : {}, this.size = 0;
  }, i.prototype.delete = function (t) {
    return t = this.has(t) && delete this.__data__[t], this.size -= t ? 1 : 0, t;
  }, i.prototype.get = function (t) {
    var e = this.__data__;return at ? (t = e[t], "__lodash_hash_undefined__" === t ? M : t) : q.call(e, t) ? e[t] : M;
  }, i.prototype.has = function (t) {
    var e = this.__data__;return at ? e[t] !== M : q.call(e, t);
  }, i.prototype.set = function (t, e) {
    var r = this.__data__;return this.size += this.has(t) ? 0 : 1, r[t] = at && e === M ? "__lodash_hash_undefined__" : e, this;
  }, c.prototype.clear = function () {
    this.__data__ = [], this.size = 0;
  }, c.prototype.delete = function (t) {
    var e = this.__data__;return t = l(e, t), !(0 > t) && (t == e.length - 1 ? e.pop() : X.call(e, t, 1), --this.size, true);
  }, c.prototype.get = function (t) {
    var e = this.__data__;return t = l(e, t), 0 > t ? M : e[t][1];
  }, c.prototype.has = function (t) {
    return -1 < l(this.__data__, t);
  }, c.prototype.set = function (t, e) {
    var r = this.__data__,
        n = l(r, t);return 0 > n ? (++this.size, r.push([t, e])) : r[n][1] = e, this;
  }, s.prototype.clear = function () {
    this.size = 0, this.__data__ = { hash: new i(), map: new (et || c)(), string: new i() };
  }, s.prototype.delete = function (t) {
    return t = g(this, t).delete(t), this.size -= t ? 1 : 0, t;
  }, s.prototype.get = function (t) {
    return g(this, t).get(t);
  }, s.prototype.has = function (t) {
    return g(this, t).has(t);
  }, s.prototype.set = function (t, e) {
    var r = g(this, t),
        n = r.size;return r.set(t, e), this.size += r.size == n ? 0 : 1, this;
  }, u.prototype.add = u.prototype.push = function (t) {
    return this.__data__.set(t, "__lodash_hash_undefined__"), this;
  }, u.prototype.has = function (t) {
    return this.__data__.has(t);
  }, f.prototype.clear = function () {
    this.__data__ = new c(), this.size = 0;
  }, f.prototype.delete = function (t) {
    var e = this.__data__;return t = e.delete(t), this.size = e.size, t;
  }, f.prototype.get = function (t) {
    return this.__data__.get(t);
  }, f.prototype.has = function (t) {
    return this.__data__.has(t);
  }, f.prototype.set = function (t, e) {
    var r = this.__data__;if (r instanceof c) {
      var n = r.__data__;if (!et || 199 > n.length) return n.push([t, e]), this.size = ++r.size, this;r = this.__data__ = new s(n);
    }return r.set(t, e), this.size = r.size, this;
  };var _t = Z ? function (e) {
    return null == e ? [] : (e = Object(e), t(Z(e), function (t) {
      return Q.call(e, t);
    }));
  } : E,
      bt = b;(J && "[object DataView]" != bt(new J(new ArrayBuffer(1))) || et && "[object Map]" != bt(new et()) || rt && "[object Promise]" != bt(rt.resolve()) || nt && "[object Set]" != bt(new nt()) || ot && "[object WeakMap]" != bt(new ot())) && (bt = function bt(t) {
    var e = b(t);if (t = (t = "[object Object]" == e ? t.constructor : M) ? A(t) : "") switch (t) {
      case it:
        return "[object DataView]";case ct:
        return "[object Map]";case st:
        return "[object Promise]";case ut:
        return "[object Set]";case ft:
        return "[object WeakMap]";}return e;
  });var ht = h(function () {
    return arguments;
  }()) ? h : function (t) {
    return S(t) && q.call(t, "callee") && !Q.call(t, "callee");
  },
      pt = Array.isArray,
      yt = $ || F,
      jt = D ? r(D) : y;a.keys = x, a.eq = m, a.isArguments = ht, a.isArray = pt, a.isArrayLike = w, a.isBuffer = yt, a.isEqual = function (t, e) {
    return p(t, e);
  }, a.isFunction = O, a.isLength = z, a.isObject = k, a.isObjectLike = S, a.isTypedArray = jt, a.stubArray = E, a.stubFalse = F, a.VERSION = "4.17.4", typeof define == "function" && _typeof(define.amd) == "object" && define.amd ? (I._ = a, define(function () {
    return a;
  })) : U ? ((U.exports = a)._ = a, T._ = a) : I._ = a;
}).call(undefined);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[4]);
