import SelectorSet from './selector-set';

var el = null;
var observer = null;
var queue = [];

function scheduleBatch(document, callback) {
  var calls = [];

  function processBatchQueue() {
    var callsCopy = calls;
    calls = [];
    callback(callsCopy);
  }

  function scheduleBatchQueue() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    calls.push(args);
    if (calls.length === 1) scheduleMacroTask(document, processBatchQueue);
  }

  return scheduleBatchQueue;
}

function scheduleMacroTask(document, callback) {
  if (!observer) {
    observer = new MutationObserver(handleMutations);
  }

  if (!el) {
    el = document.createElement('div');
    observer.observe(el, { attributes: true });
  }

  queue.push(callback);
  el.setAttribute('data-twiddle', '' + Date.now());
}

function handleMutations() {
  var callbacks = queue;
  queue = [];
  for (var i = 0; i < callbacks.length; i++) {
    try {
      callbacks[i]();
    } catch (error) {
      setTimeout(function () {
        throw error;
      }, 0);
    }
  }
}

// selector-observer processes dom mutations in two phases. This module applies
// the Change set from the first phase and invokes the any registered hooks.

var initMap = new WeakMap();
var initializerMap = new WeakMap();
var subscriptionMap = new WeakMap();
var addMap = new WeakMap();

function applyChanges(selectorObserver, changes) {
  for (var i = 0; i < changes.length; i++) {
    var change = changes[i];
    var type = change[0];
    var el = change[1];
    var observer = change[2];
    if (type === ADD) {
      runInit(observer, el);
      runAdd(observer, el);
    } else if (type === REMOVE) {
      runRemove(observer, el);
    } else if (type === REMOVE_ALL) {
      runRemoveAll(selectorObserver.observers, el);
    }
  }
}

// Run observer node "initialize" callback once.
// Call when observer selector matches node.
//
// observer - An observer Object.
// el       - An Element
//
// Returns nothing.
function runInit(observer, el) {
  if (!(el instanceof observer.elementConstructor)) {
    return;
  }

  var initIds = initMap.get(el);
  if (!initIds) {
    initIds = [];
    initMap.set(el, initIds);
  }

  if (initIds.indexOf(observer.id) === -1) {
    var initializer = void 0;
    if (observer.initialize) {
      initializer = observer.initialize.call(undefined, el);
    }
    if (initializer) {
      var initializers = initializerMap.get(el);
      if (!initializers) {
        initializers = {};
        initializerMap.set(el, initializers);
      }
      initializers['' + observer.id] = initializer;
    }
    initIds.push(observer.id);
  }
}

// Run observer node "add" callback.
// Call when observer selector matches node.
//
// observer - An observer Object.
// el       - An Element
//
// Returns nothing.
function runAdd(observer, el) {
  if (!(el instanceof observer.elementConstructor)) {
    return;
  }

  var addIds = addMap.get(el);
  if (!addIds) {
    addIds = [];
    addMap.set(el, addIds);
  }

  if (addIds.indexOf(observer.id) === -1) {
    observer.elements.push(el);

    var initializers = initializerMap.get(el);
    var initializer = initializers ? initializers['' + observer.id] : null;
    if (initializer && initializer.add) {
      initializer.add.call(undefined, el);
    }

    if (observer.subscribe) {
      var subscription = observer.subscribe.call(undefined, el);
      if (subscription) {
        var subscriptions = subscriptionMap.get(el);
        if (!subscriptions) {
          subscriptions = {};
          subscriptionMap.set(el, subscriptions);
        }
        subscriptions['' + observer.id] = subscription;
      }
    }

    if (observer.add) {
      observer.add.call(undefined, el);
    }

    addIds.push(observer.id);
  }
}

// Runs all observer element "remove" callbacks.
// Call when element is completely removed from the DOM.
//
// observer - An observer Object.
// el       - An Element
//
// Returns nothing.
function runRemove(observer, el) {
  if (!(el instanceof observer.elementConstructor)) {
    return;
  }

  var addIds = addMap.get(el);
  if (!addIds) {
    return;
  }

  var index = observer.elements.indexOf(el);
  if (index !== -1) {
    observer.elements.splice(index, 1);
  }

  index = addIds.indexOf(observer.id);
  if (index !== -1) {
    var initializers = initializerMap.get(el);
    var initializer = initializers ? initializers['' + observer.id] : null;
    if (initializer) {
      if (initializer.remove) {
        initializer.remove.call(undefined, el);
      }
    }

    if (observer.subscribe) {
      var subscriptions = subscriptionMap.get(el);
      var subscription = subscriptions ? subscriptions['' + observer.id] : null;
      if (subscription && subscription.unsubscribe) {
        subscription.unsubscribe();
      }
    }

    if (observer.remove) {
      observer.remove.call(undefined, el);
    }

    addIds.splice(index, 1);
  }

  if (addIds.length === 0) {
    addMap.delete(el);
  }
}

// Runs all observer element "remove" callbacks.
// Call when element is completely removed from the DOM.
//
// observes - Array of observers
// el - An Element
//
// Returns nothing.
function runRemoveAll(observers, el) {
  var addIds = addMap.get(el);
  if (!addIds) {
    return;
  }

  var ids = addIds.slice(0);
  for (var i = 0; i < ids.length; i++) {
    var observer = observers[ids[i]];
    if (!observer) {
      continue;
    }

    var index = observer.elements.indexOf(el);
    if (index !== -1) {
      observer.elements.splice(index, 1);
    }

    var initializers = initializerMap.get(el);
    var initializer = initializers ? initializers['' + observer.id] : null;
    if (initializer && initializer.remove) {
      initializer.remove.call(undefined, el);
    }

    var subscriptions = subscriptionMap.get(el);
    var subscription = subscriptions ? subscriptions['' + observer.id] : null;
    if (subscription && subscription.unsubscribe) {
      subscription.unsubscribe();
    }

    if (observer.remove) {
      observer.remove.call(undefined, el);
    }
  }
  addMap.delete(el);
}

var innerHTMLReplacementIsBuggy = null;

// In IE 9/10/11 replacing child via innerHTML will orphan all of the child
// elements. This prevents walking the descendants of removedNodes.
// https://connect.microsoft.com/IE/feedback/details/797844/ie9-10-11-dom-child-kill-bug
function detectInnerHTMLReplacementBuggy(document) {
  if (innerHTMLReplacementIsBuggy === null) {
    var a = document.createElement('div');
    var b = document.createElement('div');
    var c = document.createElement('div');
    a.appendChild(b);
    b.appendChild(c);
    a.textContent = '';
    innerHTMLReplacementIsBuggy = c.parentNode !== b;
  }
  return innerHTMLReplacementIsBuggy;
}

function supportsSelectorMatching(node) {
  return 'matches' in node || 'webkitMatchesSelector' in node || 'mozMatchesSelector' in node || 'oMatchesSelector' in node || 'msMatchesSelector' in node;
}

// selector-observer processes dom mutations in two phases. This module
// processes DOM mutations, revalidates selectors against the target element and
// enqueues a Change for an observers hooks to be ran.

// A set of Changes is structured as an Array of tuples:
//
// [ADD, element, observer]: Indicates that an observer starting matching
// the element.
var ADD = 1;

// [REMOVE, element, observer]: Indicates that an observer stopped matching
// the element.
var REMOVE = 2;

// [REMOVE_ALL, element]: Indicates that an element was removed from the
// document and all related observers stopped matching the element.
var REMOVE_ALL = 3;

// A handler for processing MutationObserver mutations.
//
// selectorObserver - The SelectorObserver
// changes - Array of changes to append to
// mutations - An array of MutationEvents
//
// Return nothing.
function handleMutations$1(selectorObserver, changes, mutations) {
  for (var i = 0; i < mutations.length; i++) {
    var mutation = mutations[i];
    if (mutation.type === 'childList') {
      addNodes(selectorObserver, changes, mutation.addedNodes);
      removeNodes(selectorObserver, changes, mutation.removedNodes);
    } else if (mutation.type === 'attributes') {
      revalidateObservers(selectorObserver, changes, mutation.target);
    }
  }
  if (detectInnerHTMLReplacementBuggy(selectorObserver.ownerDocument)) {
    revalidateOrphanedElements(selectorObserver, changes);
  }
}

// Run observer node "add" callback once on the any matching
// node and its subtree.
//
// selectorObserver - The SelectorObserver
// changes - Array of changes to append to
// nodes   - A NodeList of Nodes
//
// Returns nothing.
function addNodes(selectorObserver, changes, nodes) {
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];

    if (supportsSelectorMatching(node)) {
      var matches = selectorObserver.selectorSet.matches(node);
      for (var j = 0; j < matches.length; j++) {
        var data = matches[j].data;

        changes.push([ADD, node, data]);
      }
    }

    if ('querySelectorAll' in node) {
      var matches2 = selectorObserver.selectorSet.queryAll(node);
      for (var _j = 0; _j < matches2.length; _j++) {
        var _matches2$_j = matches2[_j],
          _data = _matches2$_j.data,
          elements = _matches2$_j.elements;

        for (var k = 0; k < elements.length; k++) {
          changes.push([ADD, elements[k], _data]);
        }
      }
    }
  }
}

// Run all observer node "remove" callbacks on the node
// and its entire subtree.
//
// selectorObserver - The SelectorObserver
// changes - Array of changes to append to
// nodes   - A NodeList of Nodes
//
// Returns nothing.
function removeNodes(selectorObserver, changes, nodes) {
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    if ('querySelectorAll' in node) {
      changes.push([REMOVE_ALL, node]);
      var descendants = node.querySelectorAll('*');
      for (var j = 0; j < descendants.length; j++) {
        changes.push([REMOVE_ALL, descendants[j]]);
      }
    }
  }
}

// Recheck all "add" observers to see if the selector still matches.
// If not, run the "remove" callback.
//
// selectorObserver - The SelectorObserver
// changes - Array of changes to append to
// node    - A Node
//
// Returns nothing.
function revalidateObservers(selectorObserver, changes, node) {
  if (supportsSelectorMatching(node)) {
    var matches = selectorObserver.selectorSet.matches(node);
    for (var i = 0; i < matches.length; i++) {
      var data = matches[i].data;

      changes.push([ADD, node, data]);
    }
  }

  if ('querySelectorAll' in node) {
    var ids = addMap.get(node);
    if (ids) {
      for (var _i = 0; _i < ids.length; _i++) {
        var observer = selectorObserver.observers[ids[_i]];
        if (observer) {
          if (!selectorObserver.selectorSet.matchesSelector(node, observer.selector)) {
            changes.push([REMOVE, node, observer]);
          }
        }
      }
    }
  }
}

// Recheck all "add" observers to see if the selector still matches.
// If not, run the "remove" callback. Runs on node and all its descendants.
//
// selectorObserver - The SelectorObserver
// changes - Array of changes to append to
// node    - The root Node
//
// Returns nothing.
function revalidateDescendantObservers(selectorObserver, changes, node) {
  if ('querySelectorAll' in node) {
    revalidateObservers(selectorObserver, changes, node);
    var descendants = node.querySelectorAll('*');
    for (var i = 0; i < descendants.length; i++) {
      revalidateObservers(selectorObserver, changes, descendants[i]);
    }
  }
}

// Recheck input after "change" event and possible related form elements.
//
// selectorObserver - The SelectorObserver
// changes - Array of changes to append to
// input   - The HTMLInputElement
//
// Returns nothing.
function revalidateInputObservers(selectorObserver, changes, inputs) {
  for (var i = 0; i < inputs.length; i++) {
    var input = inputs[i];
    var els = input.form ? input.form.elements : selectorObserver.rootNode.querySelectorAll('input');
    for (var j = 0; j < els.length; j++) {
      revalidateObservers(selectorObserver, changes, els[j]);
    }
  }
}

// Check all observed elements to see if they are still in the DOM.
// Only intended to run on IE where innerHTML replacement is buggy.
//
// selectorObserver - The SelectorObserver
// changes - Array of changes to append to
//
// Returns nothing.
function revalidateOrphanedElements(selectorObserver, changes) {
  for (var i = 0; i < selectorObserver.observers.length; i++) {
    var observer = selectorObserver.observers[i];
    if (observer) {
      var elements = observer.elements;

      for (var j = 0; j < elements.length; j++) {
        var el = elements[j];
        if (!el.parentNode) {
          changes.push([REMOVE_ALL, el]);
        }
      }
    }
  }
}

function whenReady(document, callback) {
  var readyState = document.readyState;
  if (readyState === 'interactive' || readyState === 'complete') {
    scheduleMacroTask(document, callback);
  } else {
    document.addEventListener('DOMContentLoaded', scheduleMacroTask(document, callback));
  }
}

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};

// Observer uid counter
var uid = 0;

function SelectorObserver(rootNode) {
  this.rootNode = rootNode.nodeType === 9 ? rootNode.documentElement : rootNode;
  this.ownerDocument = rootNode.nodeType === 9 ? rootNode : rootNode.ownerDocument;

  // Map of observer id to object
  this.observers = [];

  // Index of selectors to observer objects
  this.selectorSet = new SelectorSet();

  // Process all mutations from root element
  this.mutationObserver = new MutationObserver(handleRootMutations.bind(this, this));

  this._scheduleAddRootNodes = scheduleBatch(this.ownerDocument, addRootNodes.bind(this, this));

  this._handleThrottledChangedTargets = scheduleBatch(this.ownerDocument, handleChangedTargets.bind(this, this));
  this.rootNode.addEventListener('change', handleChangeEvents.bind(this, this), false);

  whenReady(this.ownerDocument, onReady.bind(this, this));
}

SelectorObserver.prototype.disconnect = function () {
  this.mutationObserver.disconnect();
};

// Register a new observer.
//
// selector - String CSS selector.
// handlers - Initialize Function or Object with keys:
//   initialize - Function to invoke once when Node is first matched
//   add        - Function to invoke when Node matches selector
//   remove     - Function to invoke when Node no longer matches selector
//   subscribe  - Function to invoke when Node matches selector and returns Subscription.
//
// Returns Observer object.
SelectorObserver.prototype.observe = function (a, b) {
  var handlers = void 0;

  if (typeof b === 'function') {
    handlers = {
      selector: a,
      initialize: b
    };
  } else if ((typeof b === 'undefined' ? 'undefined' : _typeof(b)) === 'object') {
    handlers = b;
    handlers.selector = a;
  } else {
    handlers = a;
  }

  var self = this;

  var observer = {
    id: uid++,
    selector: handlers.selector,
    initialize: handlers.initialize,
    add: handlers.add,
    remove: handlers.remove,
    subscribe: handlers.subscribe,
    elements: [],
    elementConstructor: handlers.hasOwnProperty('constructor') ? handlers.constructor : this.ownerDocument.defaultView.Element,
    abort: function abort() {
      self._abortObserving(observer);
    }
  };
  this.selectorSet.add(observer.selector, observer);
  this.observers[observer.id] = observer;
  this._scheduleAddRootNodes();

  return observer;
};

// Removes observer and calls any remaining remove hooks.
//
// observer - Observer object
//
// Returns nothing.
SelectorObserver.prototype._abortObserving = function (observer) {
  var elements = observer.elements;
  for (var i = 0; i < elements.length; i++) {
    runRemove(observer, elements[i]);
  }
  this.selectorSet.remove(observer.selector, observer);
  delete this.observers[observer.id];
};

// Internal: For hacking in dirty changes that aren't getting picked up
SelectorObserver.prototype.triggerObservers = function (container) {
  var changes = [];
  revalidateDescendantObservers(this, changes, container);
  applyChanges(this, changes);
};

function onReady(selectorObserver) {
  selectorObserver.mutationObserver.observe(selectorObserver.rootNode, {
    childList: true,
    attributes: true,
    subtree: true
  });
  selectorObserver._scheduleAddRootNodes();
}

function addRootNodes(selectorObserver) {
  var changes = [];
  addNodes(selectorObserver, changes, [selectorObserver.rootNode]);
  applyChanges(selectorObserver, changes);
}

function handleRootMutations(selectorObserver, mutations) {
  var changes = [];
  handleMutations$1(selectorObserver, changes, mutations);
  applyChanges(selectorObserver, changes);
}

function handleChangeEvents(selectorObserver, event) {
  selectorObserver._handleThrottledChangedTargets(event.target);
}

function handleChangedTargets(selectorObserver, inputs) {
  var changes = [];
  revalidateInputObservers(selectorObserver, changes, inputs);
  applyChanges(selectorObserver, changes);
}

// observe
//
// Observe provides a declarative hook thats informed when an element becomes
// matched by a selector, and then when it stops matching the selector.
//
// Examples
//
//   observe('.js-foo', (el) => {
//     console.log(el, 'was added to the DOM')
//   })
//
//   observe('.js-bar', {
//     add(el) { console.log('js-bar was added to', el) },
//     remove(el) { console.log 'js-bar was removed from', el) }
//   })
//

var documentObserver = void 0;

function getDocumentObserver() {
  if (!documentObserver) {
    documentObserver = new SelectorObserver(window.document);
  }
  return documentObserver;
}

function observe() {
  var _getDocumentObserver;

  return (_getDocumentObserver = getDocumentObserver()).observe.apply(_getDocumentObserver, arguments);
}

function triggerObservers() {
  var _getDocumentObserver2;

  return (_getDocumentObserver2 = getDocumentObserver()).triggerObservers.apply(_getDocumentObserver2, arguments);
}

export default SelectorObserver;
export { getDocumentObserver, observe, triggerObservers };
