#Backbone.speed_cache 0.2
May be freely distributed under the MIT license

sync code & ideas adopted from:
	**Backbone.memoized_sync 0.1**
	by Pablo Villalba for the Teambox project 
	*distributed under the MIT license*

What does Backbone.speed_cache solve
--------------------------------------
This modified version changes the behavior for 'read' requests to the following:

1. Check if we have it in localStorage.
2. If we have it, then...
  - We call the success function with the cached data
  - We request new data with an AJAX request, which calls the success function again if the data is different from the cache
3. If we don't have it, we do a classic AJAX request and save its results to localStorage

All Data stored in localStorage is encrypted.

How to enabled memoized sync for your models and collections
------------------------------------------------------------
1. Inlcude backbone.speed_cache.js
2. Call Backbone.secureStorage.setEncKey(key) with an user specific key as soon as possible. Until then, data is kept in memory only.

Dependencies: Tea.js (included in repository)

Warnings
------------------------------------------------------------
* Including this file will override the default backbone sync method.
* Until an encryption key is provided, data is only kept in memory.
* Simple cache clearing method DELETES ALL local storage after 100 cache entries.
* Modeled after Backbone 0.9.2