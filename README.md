# wikiquotes-api-gui
JavaScript API+GUI fetches quotes from [Wikiquote](https://en.wikiquote.org/wiki/Main_Page) and displays them in a fully functioning GUI for drop-in use in your application. Try the  [Standalone Demo](https://www.genolve.com/js/wikiquote-api/index.htm) or the [Fully Integrated Demo- click 'text' then click 'Wikiquote'](https://www.genolve.com/svg/en/alldesigns.php?cardtype=quotes&subtype=popular&mediatype=picture)

#### Installation
Download the files and add in html header:

```
<script type="text/javascript" src="wikiquote-api-gui.js"></script>
<link type="text/css" rel="stylesheet" href="wiki-api-gui-styles.css" />
```




#### Usage
The GUI interface resides in a DIV in your application and returns the quotes via a callback function you specify on initialization:


		WikiquoteApi =  new WikiquoteApiClass(vpr,$);
		WikiquoteApi.selfConstruct({initsearch:'Einstein',
			waiticon:'<span id="spinner" class="gnlv-blink">working!<span>',
			containerDiv:'#quote-container',
			clickHandler: myhandler
			});

Example callback function:

```
var myhandler = function(thequote){
			$('#quote-of-day').html(thequote);
			}
```



#### Requirements

JQuery is the only requirement, any version above 2.1

#### Features
* Intelligently searches Wikiquote, falling back to opensearch if nothing is found
* Based on search, displays links to related pages 
* Keeps a search history to quickly return to previous pages
* Filters results to only the most popular quotes

#### Credit
wikiquotes-api-gui adds a GUI and extensively expands on natetyler's [wikiquotes-api](https://github.com/natetyler/wikiquotes-api).

#### Contributing
Contributions and feedback welcome! Just drop a note or as usual; fork, make your update, pull request.
