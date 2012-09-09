// Backbone SpeedCache v0.2
// by Gregor Godbersen
// May be freely distributed under the MIT license 

// Dependencies: Underscore.js, Backbone.js, Tea.js
// ! Including this file will override the default backbone sync method.
// ! Until an encryption key is provided, data is only kept in memory.
// ! Simple cache clearing method DELETES ALL local storage after 100 cache entries.
// ! Modeled after Backbone 0.9.2

// All results of ajax GET request are saved to local storage. 
// Upon new requests, the success function will be called immediately with the cached data before launching the regular ajax request. 
//	If the ajax request returns differing data, the success function will be called again with the fresh data.
// All Data is encrypted before beeing written to local storage. Call Backbone.secureStorage.setEncKey(key) with an user specific key.

// sync code & ideas adopted from Backbone.memoized_sync 0.1 by Pablo Villalba for the Teambox project distributed under the MIT license 

(function () {
  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'delete': 'DELETE',
    'read'  : 'GET'
  };

  // Helper function to get a URL from a Model or Collection as a property
  // or as a function.
  var getUrl = function(object) {
    if (!(object && object.url)) return null;
    return _.isFunction(object.url) ? object.url() : object.url;
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
			data = localStorage.getItem(key);
			if(data == null) return '';
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

   
  // Overriding the sync method
  Backbone.memoized_sync =  function (method, model, options) {
        var type = methodMap[method];

    // Default options, unless specified.
    options || (options = {});

    // Default JSON-request options.
    var params = _.extend(options,{type: type, dataType: 'json'});

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = getUrl(model) || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (!options.data && model && (method == 'create' || method == 'update')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(model.toJSON());
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (Backbone.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (Backbone.emulateHTTP) {
      if (type === 'PUT' || type === 'DELETE') {
        if (Backbone.emulateJSON) params.data._method = type;
        params.type = 'POST';
        params.beforeSend = function(xhr) {
          xhr.setRequestHeader('X-HTTP-Method-Override', type);
        };
      }
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !Backbone.emulateJSON) {
      params.processData = false;
    }
	
    var key = "backbone_cache_" + params.url;
    if (method === 'read') {
      // Look for the cached version
	  
	  var valString =  Backbone.secureStorage.getItem(key),
		  successFn = params.success;
		  
	  // If we have the last response cached, use it with the success callback
      if (valString) {
        _.defer(function () {
          successFn(JSON.parse(valString), "success");
        });
      }
	  
      // Overwrite the success callback to save data to localStorage
      params.success = function (resp, status, xhr) {
		 if(valString && JSON.stringify(JSON.parse(valString)) == JSON.stringify(resp))
			return; // if new data is equal to cached, do not recall success function
		 
		 successFn(resp, status, xhr);
         Backbone.secureStorage.setItem(key, xhr.responseText);
      };

    }

    // Make the request.
     return $.ajax(params);
  };

}).call(this);

// Override original function
Backbone.sync = Backbone.memoized_sync;