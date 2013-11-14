// Backbone SpeedCache v0.3
// by Gregor Godbersen
// Originally forked from Backbone.memoized_sync 0.1 by Pablo Villalba

// May be freely distributed under the MIT license 


// Dependencies: Underscore.js, Backbone.js, Tea.js


// !!Warnings!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !
// ! Including this file will override the default backbone sync method.
// ! Until an encryption key is provided, data is only kept in memory.
// ! Simple cache clearing method DELETES ALL local storage after 100 cache entries.
// ! Targets Backbone.js 1.0.0
// !
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!



// All results of ajax GET request are saved to local storage. 
// Upon new requests, the success function will be called immediately with the cached data before launching the regular ajax request. 
// If the ajax request returns differing data, the success function will be called again with the fresh data.
// All Data is encrypted before beeing written to local storage. Call Backbone.secureStorage.setEncKey(key) with an user specific key.


 
 
 
(function () { 
  
  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Ported from Modernizr
  function supports_local_storage() {
    try {
      return 'localStorage' in window && window.localStorage !== null;
    } catch (e) {
      return false;
    }
  }
 
 // interface to localStorage, handles encryption & localStorage feature detection
  Backbone.secureStorage = {
		enc_key : false,
		tempMemory : [],
		
		setEncKey: function(key){
			if(!supports_local_storage()) return; // encryption only needed for local storage 
			
			if(!this.enc_key){
				this.enc_key = key;
				// Ugly Hack to prevent local storage from overfilling
				// Will interfer with App if localStorage is used otherwise
				if(localStorage.length>100) 
					localStorage.clear(); 
					
				// write memory cache to localStorage
				for(var i in this.tempMemory)
					this.setItem(this.tempMemory[i].key,this.tempMemory[i].data);
				this.tempMemory = [];
				
			}else
				console.warn("Please set only once"); // changing of encryption key is not supported
		},
		
		getItem: function(key){
			// if encryption key has not been given, or local storage is unavaliable: Serve the request from memory array.
			if(!this.enc_key || !supports_local_storage()) 
				return _.find(this.tempMemory,function(val){  return val.key == key });
			
			// otherwise serve from storage
			key = Tea.encrypt(key,this.enc_key);
			
                        var data = localStorage.getItem(key);
			if(data == null || data.length == 0) return null;
			return Tea.decrypt(data,this.enc_key);
		
	    },
		
	    setItem: function(key,data){
			// if encryption key hasn't been set or local storage is not supported: Store data in memory array.
			if(!this.enc_key || !supports_local_storage()) {
				this.tempMemory.push({"key":key,"data":data});
				return false;
			}
			
			// otherwise: encrypt data and store in local storage
			key = Tea.encrypt(key,this.enc_key);
			data = Tea.encrypt(data,this.enc_key);
			return localStorage.setItem(key,data);
	   }
   }



Backbone.speed_cache = function(method, model, options) {
    
    var noXhrPatch = typeof window !== 'undefined' && !!window.ActiveXObject && !(window.XMLHttpRequest && (new XMLHttpRequest).dispatchEvent);

	// Map from CRUD to HTTP for our default `Backbone.sync` implementation.
	var methodMap = {
		'create': 'POST',
		'update': 'PUT',
		'patch':  'PATCH',
		'delete': 'DELETE',
		'read':   'GET'
	};
    
    var type = methodMap[method];

    // Default options, unless specified.
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // If we're sending a `PATCH` request, and we're in an old Internet Explorer
    // that still has ActiveX enabled by default, override jQuery to use that
    // for XHR instead. Remove this line when jQuery supports `PATCH` on IE8.
    if (params.type === 'PATCH' && noXhrPatch) {
      params.xhr = function() {
        return new ActiveXObject("Microsoft.XMLHTTP");
      };
    }
    
    var key = "backbone_cache_" + params.url;
    
    if (method === 'read') {
		  // Look for the cached version
		  
		var cachedString =  Backbone.secureStorage.getItem(key),
			successFn = options.success;
		delete options.success;
		if(cachedString)
			successFn(JSON.parse(cachedString), 'success', options);


		
		// Overwrite the success callback to save data to localStorage
        options.success = function (model, resp, options) {
		 var responseString = JSON.stringify(model);
		 if(cachedString && JSON.stringify(JSON.parse(cachedString)) == responseString)
			return; // if new data is equal to cached, do not recall success function
		 
          successFn(model, resp, options);
          Backbone.secureStorage.setItem(key, responseString);
      };
	}
	
    // Make the request, allowing the user to override any Ajax options.
    var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };


 }).call(this);
 
 // install as default sync provider
 Backbone.sync = Backbone.speed_cache;
