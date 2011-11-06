Backbone.memoized_sync 0.1.0
==========================

Made by Pablo Villalba for the Teambox project
May be freely distributed under the MIT license


What does Backbone.memoized_sync solve
--------------------------------------

The default Backbone.sync sends an AJAX request every time. When an app needs to
request too much data to start up, the UX can suffer.

This modified version changes the behavior for 'read' requests to the following:

1. Check if we have it in localStorage.
2. If we have it, then...
  - We call the success function with the cached data
  - We request new data with an AJAX request, which calls the success function again
3. If we don't have it, we do a classic AJAX request and save its results to localStorage


How to enabled memoized sync for your models and collections
------------------------------------------------------------

You must define your model's or collection's sync to be Backbone.memoized_sync:

    this.sync = Backbone.memoized_sync;

That's it! Now every GET request will be written to localStorage and retrieved
from there the next time you request it.


Handling multiple sessions or users
-----------------------------------

In order to use this with per-session caches, you will need to define the
*cache_namespace* attribute in your models and collections. The sync method will
store the results of successful calls in "#{cache_namespace}/#{requested_url}"

If you are caching sensitive data, remember to clear localStorage when logging out
or when loggin in with a different user.


Targeted Backbone versions
--------------------------
This modified Backbone.sync targets Backbone 0.5.3.

