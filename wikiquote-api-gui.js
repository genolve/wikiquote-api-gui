/*
CLASS: WikiquoteApi - utility functions to query wikiquotes and display results in a div

 ==ClosureCompiler==
 @compilation_level SIMPLE_OPTIMIZATIONS
 @output_file_name wikiquote-api.js
 ==/ClosureCompiler==
 methods:
selfConstruct  - setup div framework, input textbox  (inside containerDiv) and optionally load an initial query
openAuxSearch  - Search using opensearch api.  Returns an array of search results.
openSearch     - Search using search api.  Returns an array of search results.
findRedirect   - get redirect by parsing links for given pageid/titles
findCatId      - given a category search term, find the Id and forward to getQuality
listCategories - list Category, with a GENERATOR, for specified word.
mkPageLink     - make a page/category link
moreLike       - Search using moreLike api. 
queryTitles    - Query based on "titles" parameter and return page id.
getSectionsForPage - Get the sections for a given page.
quoteReady     - strip html and display the quote
getQuotesForSection - Get all quotes for a given section. 
getWikiForSection - Get Wikipedia page for specific section
toggleNewlines - add/remove newlines (<br>)
capitalizeString - Capitalize the first letter of each word
catagorizeString - Capitalize the first letter of each word
clearDivs      - clear out divs show wait icon and handle history stack
goBackl        - pop history stacks and load to appropriate divs
getLastSearch  - get last item on history stack
*/
WikiquoteApiClass = function(vpr,$) {

  var wqa = this;
  var pageId=1;
  var API_URL = "https://en.wikiquote.org/w/api.php";
  var API_NAME = "WikiquoteApi";   
  var historyA = [];
  var historytA = [];
  var historyiA = [];     
  var dontclearcats=0;
  var qualityDown=false;
  var prevsearch="Search for quotes";
	// GLOBAL HELPER OBJ 
	if(vpr==null)vpr={};
	var vpradd={name:'minivpr',
			noop:function(){ // do nothing function
								},
		// DEBUG
		vprint:function(tag,stuff){
			console.log(tag+stuff);// comment out for production!
			} ,
		// DEBUG
		dumpvar:function(inval){return JSON.stringify(inval)},
		// UTIL
		iterate:function(obj){$.map(obj, function(element,index) {return index});},
			size: function(obj){
				return (typeof obj=='array')?(obj.length):-1;},
			dd: function (num){
				return (Math.round(parseFloat(num)*100)/100);
				},
		// UTIL
		isnull:		function(v){
			if(typeof v=='undefined')
				return true;
			v=String(v);
			if(v==="0")
				return false;
			else
				return (v=="" || v=="undefined" || v=="_All_" || v=="null" || v===null)?true:false;
			},
		//UTIL
		checkEnter : function(e){ //e is event object passed from function invocation
			var characterCode,ret_val;
			if(e && e.which){ //if which property of event object is supported (NN4)
				 e = e;
				 characterCode = e.which; //character code is contained in NN4's which property
				 }
			else{							
				 e = e;					
				 characterCode = e.keyCode; //character code is contained in IE's keyCode property
				 }
			ret_val = (characterCode == 13)?true:false;
			if(ret_val){ // stop any default actions
				e.cancelBubble = true;
				e.returnValue = false;
				document.activeElement.blur();//20161004 close ipad virtual keyboard
				if (e.stopPropagation) {
					e.stopPropagation();
					e.preventDefault();
					}
				}
			return (ret_val); 
			},
		// CALBACK
		wkUseQuote: function(){
			var picid=$(this).text(); 
			if($('#WikiquoteApinewlines').prop('checked')==true)
				picid=picid.replace(/\n/g,"<br>");
			// auto add attribute
			if($('#WikiquoteApiattribute').prop('checked')==true)
				picid +='<br>'+ $('#WikiquoteApiattribute').val();
			vpr.vprint("wiki","= = = = = = = wkUseQuote  key:"+self.imgkey+" text:"+picid);
			wqa.clickHandler(picid);
			}
		};
	for(key in vpradd)
		if(vpr[key]==null)
			vpr[key] = vpradd[key];
	vpr.vprint("wiki","Have vpr?"+vpr.name);
   /**
   selfConstruct - setup div framework, input textbox  (inside containerDiv) and optionally load an initial query
   example options:
  {initsearch:'Einstein',
										waiticon:'<span id="spinner" class="gnlv-blink">working!<span>',
										thumbWidth:150,
										containerDiv:'#quote-container',
										clickHandler: myhandler
										}
   */
  wqa.selfConstruct = function(optionsO) {
    if(optionsO.containerDiv==null)
      vpr.vprint("wiki","selfConstruct start, have NO containerDiv!");
		else if(typeof(optionsO.containerDiv=="String")){
			wqa.containerDiv=$(optionsO.containerDiv);
      vpr.vprint("wiki","selfConstruct found containerDiv?"+wqa.containerDiv.length);
			}
    else
      wqa.containerDiv=optionsO.containerDiv;
    vpr.vprint("wiki","selfConstruct start, have containerDiv:"+wqa.containerDiv.prop('id'));
    // PARAMS
    wqa.waiticon   = optionsO.waiticon;
		wqa.clickHandler = optionsO.clickHandler;
    wqa.thumbWidth = (optionsO.thumbWidth==null)?200:optionsO.thumbWidth;
    initsearch     = vpr.isnull(optionsO.initsearch)?'Oscar Wilde':optionsO.initsearch;
    // DIVS/SEARCH BOX/BACK
    wqa.containerDiv.append('Search '+API_NAME.replace(/api/i,"")+': <input id="'+API_NAME+'input" type="text" width="40" value="'+initsearch+'" style="margin:5px;" /><a id="'+API_NAME+'goback" class="gnlv-gone  " href="javascript:vpr.noop()" onClick="'+API_NAME+'.goBackl()"><< BACK</a>');
    $('#'+API_NAME+'input').on('keyup', function(event){
                  var theid = this.id;
                  var thisguy = this.value;
                  newtext = wqa.capitalizeString(thisguy);
                  vpr.vprint("wiki","event:keyup on:"+theid+" "+thisguy+" -> "+newtext);
                  if(vpr.checkEnter(event) ){
                    wqa.queryTitles(newtext,{clear:true,setPrevSearch:true});
                  }
                });
    wqa.linksDiv   = $('<div id="wikilinksdiv" class="leftit" ></div>');
    wqa.containerDiv.append(wqa.linksDiv);
    wqa.thumbsDiv  = $('<div id="wikithumbsdiv" class="leftit" ></div>');
    wqa.containerDiv.append(wqa.thumbsDiv);
    wqa.inputEl = $('#'+API_NAME+'input');
    //INIT SEARCH  
    if(initsearch!=''){
      prevsearch=initsearch;
      //wqa.listCategories(pageId,wqa.capitalizeString(initsearch));
      wqa.queryTitles(wqa.capitalizeString(initsearch));
    }
  } // end selfConstruct
  
/**
  openAuxSearch - Search using opensearch api.  Returns an array of search results.
  example call:
   https://commons.wikimedia.org/w/api.php?action=opensearch&format=json&search=Category:Pawprints&suggest=1&redirect=1&prop=categoryinfo
  response:
   ["Category:Paw",["Category:Pawnee County, Kansas","Category
:Pawnee County, Nebraska","Category:Pawnee County, Oklahoma","Category:Paw\u0142owice","Category:Pawn
 shops","Category:Pawe\u0142 M\u0105ciwoda","Category:Pawe\u0142 Stalmach","Category:Pawtucket, Rhode
 Island","Category:Pawsonaster","Category:Pawe\u0142 Sapieha (1860-1934)"],["","","","","Voir aussi 
 les cat\u00e9gories\u202f: Arts and crafts shops, Antique shops, Pawnbrokers, Second-hand markets, Outlet
 stores, Recycle Shops et Junk shops.","","","","Included species (for WoRMS,  18 December 2014):",""
],["https://commons.wikimedia.org/wiki/Category:Pawnee_County,_Kansas","https://commons.wikimedia.org
/wiki/Category:Pawnee_County,_Nebraska","https://commons.wikimedia.org/wiki/Category:Pawnee_County,_Oklahoma"
,"https://commons.wikimedia.org/wiki/Category:Paw%C5%82owice","https://commons.wikimedia.org/wiki/Category
:Pawn_shops","https://commons.wikimedia.org/wiki/Category:Pawe%C5%82_M%C4%85ciwoda","https://commons
.wikimedia.org/wiki/Category:Pawe%C5%82_Stalmach","https://commons.wikimedia.org/wiki/Category:Pawtucket
,_Rhode_Island","https://commons.wikimedia.org/wiki/Category:Pawsonaster","https://commons.wikimedia
.org/wiki/Category:Pawe%C5%82_Sapieha_(1860-1934)"]]

ref 
https://www.mediawiki.org/wiki/API:Opensearch
   */
  wqa.openAuxSearch = function(pageId, titles,  optionsO) {
    linksDiv=(optionsO && optionsO.linksDiv)?optionsO.linksDiv:wqa.linksDiv;
    $.ajax({
      url: API_URL,
      dataType: "jsonp",
      data: {
        format: "json",
        action: "opensearch",
        namespace: 14|0|6, // 0 page 6 file default 14 is cats -1 special -2 media
        suggest: "",
        limit:"50",
        profile:"fuzzy",
        redirects:"resolve",
        search: titles
      },

      success: function(result, status){
        vpr.vprint("wiki","openSSearch found:"+vpr.dumpvar(result));
        pageA=result[1]; // a list of categories
        catA=[];
        pagA=[];
        for(ii=0; ii< pageA.length; ii++){
            var infoA = pageA[ii];
            vpr.vprint("wiki","openSSearch CALBACK page["+ii+"] GOT:"+infoA);
            if(infoA.match(/^Category:/i))
              catA.push(infoA);
            else
              pagA.push(infoA);              

            } //end for
        vpr.vprint("wiki","openSSearch CALBACK DONE num cats:"+catA.length+" pages:"+pagA.length);
        if(catA.length>=1)
          wqa.mkPageLinks(catA,{isCat:true});
        if(pagA.length>=1)
          wqa.mkPageLinks(pagA);
        if(catA.length==0 && pagA.length==0)
          wqa.thumbsDiv.html('<h2>Nothing Found, check spelling or try a category!</h2>');
      },
      error: function(xhr, result, status){
        vpr.vprint("wiki","openSSearch Error for " +status+","+result+","+vpr.dumpvar(xhr));
      }
    });
  }; // end openAuxSearch
  
 /**
  openSearch - Search using search api.  Returns an array of search results
   
example call:
   https://commons.wikimedia.org/w/api.php?format=json&action=query&list=search&prop=categoryinfo&srlimit=50&srsearch=Category:Spongebob|Spongebob&redirects=resolve
response:
 {"batchcomplete":"","query":{"searchinfo":{"totalhits":23},"search":[{"ns":14,"title":"Category:SpongeBob SquarePants","size":3118,"wordcount":136,"snippet":"English: SpongeBob SquarePants \u0627\u0644\u0639\u0631\u0628\u064a\u0629: \u0633\u0628\u0648\u0646\u062c\u0628\u0648\u0628 \u0645\u0635\u0631\u0649: \u0633\u0628\u0648\u0646\u062c \u0628\u0648\u0628 \u0633\u0643\u0648\u064a\u0631 \u0628\u0627\u0646\u062a\u0632 Catal\u00e0: Bob Esponja \u010ce\u0161tina: Spongebob v kalhot\u00e1ch Cymraeg: SpynjBob Pantsgw\u00e2r","timestamp":"2016-07-14T08:11:39Z"},{"ns":14,"title":"Category:Spongebob Squarepants","size":43,"wordcount":0,"snippet":"","timestamp":"2015-04-27T08:45:34Z"}

ref 
https://www.mediawiki.org/wiki/API:Search
   */
  wqa.openSearch = function(pageId, titles,  optionsO) {
    linksDiv=(optionsO && optionsO.linksDiv)?optionsO.linksDiv:wqa.linksDiv;
    vpr.vprint("wiki","openSearch  = = START = = pageId:"+pageId+" titles:"+titles);
    $.ajax({
      url: API_URL,
      dataType: "jsonp",
      data: {
        format: "json",
        action: "query",
        list: "search",
        prop: "categoryinfo",
        srprop:"size|wordcount|redirecttitle|snippet",
        srlimit:"50",
        redirects:"resolve",
        srsearch: titles
      },

      success: function(result, status){
        vpr.vprint("wiki","openSearch CALLBACK pageId:"+pageId+" titles:"+titles+" found:"+vpr.dumpvar(result));
        if(result.query==null || result.query.search==null)
          wqa.thumbsDiv.html('<h2>Nothing Found, check spelling or try a category!</h2>')
        else {
          pageA=result.query.search; // a list of categories
          curtitleRE= new RegExp(titles,"i");
          catA=[];
          jpgA=[];
          pagA=[];
          for(ii=0; ii< pageA.length; ii++){
              var infoA = pageA[ii];
              if((infoA.snippet==""&&infoA.size==0) || infoA.snippet.match(/This category should be empty/))
                vpr.vprint("wiki","openSearch CALBACK SKIP bad page["+ii+"] GOT:"+vpr.dumpvar(infoA));
              else if(optionsO && optionsO.feelinglucky && infoA.title.match(curtitleRE) && infoA.ns==0){
                vpr.vprint("wiki","openSearch CALBACK have a * * * LUCKY MATCH * * * on page["+ii+"] GOT:"+vpr.dumpvar(infoA));
                wqa.getSectionsForPage(null,infoA.title,{clear:false});
                return;
                }
              else if(infoA.title.match(/^Category:/i))
                catA.push(infoA.title);
              else if(infoA.title.match(/^File.*(jpg|jpeg|png|gif)$/i))
                jpgA.push(infoA);
              else
                pagA.push(infoA.title);              
              } //end for
          vpr.vprint("wiki","openSearch CALBACK DONE num cats:"+catA.length+" pages:"+pagA.length+" jpgs:"+jpgA.length);
          if(catA.length>=1)
            wqa.mkPageLinks(catA,{isCat:true});
          if(pagA.length>=1)
            wqa.mkPageLinks(pagA);
          if(catA.length==0 && pagA.length==0){
            wqa.openAuxSearch(null,titles);
            dontclearcats=1;
            //wqa.thumbsDiv.html('<h2>Nothing Found, check spelling or try a category!</h2>');
            }
          }
        },
      error: function(xhr, result, status){
        vpr.vprint("wiki","openSearch Error for "+status+","+result+","+vpr.dumpvar(xhr));
      }
    });
  }; // end opensearch

/** 
  findRedirect - get redirect by parsing links for given pageid/titles
  
  call:
  https://commons.wikimedia.org/w/api.php/?format=json&action=parse&pageid=2178631&prop=links
  
  return:
  {"parse":{"title":"Category:Ocean","pageid":2178631,"links":[{"ns":10,"exists":"","*":"Template:Category redirect/en"},{"ns":10,"exists":"","*":"Template:Bad name"},{"ns":14,"exists":"","*":"Category:Oceans"}]}}
  
  ref:
  https://www.mediawiki.org/wiki/API:Parsing_wikitext
  */
  wqa.findRedirect = function(pageId, titles, optionsO) {
    linksDiv=(optionsO && optionsO.linksDiv)?optionsO.linksDiv:wqa.linksDiv;
    var mydata={
        format: "json",
        action: "parse",
        prop: "links",
        page: titles
      };
    if(pageId!=null){// swap titles for pageids
      vpr.vprint("wiki","findRedirect = =  PAGEID MODE:"+pageId);
      mydata['pageid']=pageId;
      delete mydata['page'];
      }
    vpr.vprint("wiki","findRedirect  == START ==  pageId:"+pageId+" title:"+titles);
    $.ajax({
      url: API_URL,
      dataType: "jsonp",
      cache: true,
      data: mydata,

      success: function(result, status){
        vpr.vprint("wiki","findRedirect CALLBACK START");
        var catA=[];
        var pagA=[];
        if(result.parse==null || result.parse.links==null){
          vpr.vprint("wiki","findRedirect CALLBACK NOTHING FOUND, for category["+titles+"]:"+vpr.dumpvar(result));
          wqa.openSearch(null,titles);
          }
        else{
          var linkA = result.parse.links;
          vpr.vprint("wiki","findRedirect CALLBACK GOT num links:"+linkA.length);
            for(ii=0; ii<linkA.length; ii++){
              var infoA = linkA[ii];
              vpr.vprint("wiki","findRedirect CALBACK link["+ii+"] GOT:"+vpr.dumpvar(infoA));
              if(infoA["*"].match(/^Category:/i))
                catA.push(infoA["*"] );
              else
                pagA.push(infoA["*"] );
              } //end initial pageA
            vpr.vprint("wiki","findRedirect["+titles+"] DONE num cats:"+catA.length+":");
            if(catA.length>=1) 
              wqa.listCategories(-1,catA[0]);
            else if(pagA.length>=1) 
              wqa.mkPageLinks(pagA,{divider:' | ',label:'Sub Pages:'}); 
              // list cats seems to do better!  wqa.getThumbsOneShot(pageId,catA[0]);// try thumbs oneshot on first one
          }
        }, // end success
      error: function(xhr, result, status){
        vpr.vprint("wiki","findRedirect:Error "+status+","+result+","+vpr.dumpvar(xhr));
      }
    });
  }; // end findRedirect
/** 
  findCatId - given a category search term, find the Id and forward to getQuality
  
  call:
  https://commons.wikimedia.org/w/api.php?format=json&action=query&titles=Category:Flames&redirects=resolve&prop=links|categoryinfo
  
  return: (example of a BAD redirected category that goes to Category:Flame
{"batchcomplete":"","query":{
  "pages":{"427119":{
    "pageid":427119,"ns":14,"title":"Category:Flames",
    "links":[{"ns":10,"title":"Template:Bad name"},{"ns":10,"title":"Template:Category redirect/en"},{"ns":14,"title":"Category:Flame"}],
    "categoryinfo":{"size":0,"pages":0,"files":0,"subcats":0}}}}}
    
{"batchcomplete":"","query":{
  "pages":{"1454112":{
    "pageid":1454112,"ns":14,"title":"Category:Flame",
    "categoryinfo":{"size":171,"pages":1,"files":156,"subcats":14}}}}}
  
  ref:
  https://www.mediawiki.org/wiki/API:Parsing_wikitext
  */
  wqa.findCatId = function(pageId, titles, optionsO) {
    linksDiv=(optionsO && optionsO.linksDiv)?optionsO.linksDiv:wqa.linksDiv;
    var mydata={
        format: "json",
        action: "query",
        prop: "links|categoryinfo",
    redirects:"resolve",
        titles: titles
      };
    if(pageId!=null){// swap titles for pageids
      vpr.vprint("wiki","findCatId = =  PAGEID MODE:"+pageId);
      mydata['pageid']=pageId;
      delete mydata['titles'];
      }
    vpr.vprint("wiki","findCatId  == START ==  pageId:"+pageId+" title:"+titles);
    $.ajax({
      url: API_URL,
      dataType: "jsonp",
      cache: true,
      data: mydata,

      success: function(result, status){
    var catA=[];
        vpr.vprint("wiki","findCatId CALLBACK START pageId:"+pageId+" title:"+titles);
        var catA=[];
        if(result.query==null || result.query.pages==null){
          vpr.vprint("wiki","findCatId CALLBACK NOTHING FOUND, for category["+titles+"]:"+vpr.dumpvar(result));
          //wqa.openSearch(null,titles);
          }
        else{ //---------------------------- findCatId process  ---------------------------- 
          var pageA = result.query.pages;
            for(key in pageA){
              var infoA = pageA[key];
              vpr.vprint("wiki","findCatId CALBACK page["+key+"] GOT:"+vpr.dumpvar(infoA));
        if(infoA.categoryinfo==null)
          vpr.vprint("wiki","findCatId no categoryinfo!");
        else if(infoA.categoryinfo.subcats >0 ||  infoA.categoryinfo.size >10){// ARE WE GOOD?
                vpr.vprint("wiki","findCatId LOOKS GOOD TO GO calling getQuality("+key+")");
        wqa.getQuality(key,null);
        wqa.listCategories(key,null,{isCat:true});
          }
        else if(infoA.links!=null){
        var linkA =infoA.links;
        //wqa.listCategories(-1,linkA);
        for(ii=0; ii<linkA.length;ii++)
                  if(linkA[ii].ns==14 && linkA[ii].title.match(/^Category:/i)){// take first likely candidate
                  vpr.vprint("wiki","findCatId looks promising:"+linkA[ii].title);
          catA.push(linkA[ii]);
          }
          }
              else {
                vpr.vprint("wiki","findCatId NO CATEGORYINFO OR LINKS for:"+titles);
        if(!titles.match(/s$/)) // try an s
          wqa.findCatId(null,titles+"s");
          }
        if(catA.length>0){
                // too annoying if it dont clear  dontclearcats=1;
          wqa.mkPageLinks(catA,{isCat:true});
          wqa.findCatId(null,catA[0].title);
        }
              } //end initial pageA
            vpr.vprint("wiki","findCatId["+titles+"] DONE num cats:"+catA.length+":");
          }
        }, // end success
      error: function(xhr, result, status){
        vpr.vprint("wiki","findCatId:Error "+status+","+result+","+vpr.dumpvar(xhr));
      }
    });
  }; // end findCatId
   /**
   listCategories - list Category, with a GENERATOR, for specified word.
   call example:
https://en.wikiquote.org/w/api.php?format=json&action=query&generator=categorymembers&prop=categoryinfo&redirects=resolve&gcmlimit=500&gcmtitle=Category%3AAnime
   
   expecting:
  {"batchcomplete":"","query":{"pages":{"40414":{"pageid":40414,"ns":0,"title":".hack//Roots"},"128590":{"pageid":128590,"ns":0,"title":"Akira (film)"},"147120":{"pageid":147120,"ns":0,"title":"Another (anime)"},"130469":{"pageid":130469,"ns":0,"title":"Armitage III"},"79383":{"pageid":79383,"ns":0,"title":"The Big O"},"189436":{"pageid":189436,"ns":0,"title":"Blood+"}

  changes:
  20170412 add cats only prop
*/
  wqa.listCategories = function(pageId, titles, optionsO) {
    linksDiv=(optionsO && optionsO.linksDiv)?optionsO.linksDiv:wqa.linksDiv;
    vpr.vprint("wiki","listCategories   = =  START  = =  pageId:"+pageId+" title:"+titles);
  var mydata = {
        format: "json",
        action: "query",
        generator: "categorymembers",
        prop: "categoryinfo",
        redirects: "resolve",
        gcmlimit:"500",
        gcmtitle: titles
      };
  if(pageId!=null){// swap titles for pageids
      vpr.vprint("wiki","listCategories = =  PAGEID MODE with id:"+pageId);
      mydata['gcmpageid']=pageId;
      delete mydata['gcmtitle'];
      }
  if(optionsO && optionsO.isCat)// skip pages (already have them)
    mydata.gcmtype="subcat|page";
  if(optionsO && optionsO.clear) // do clear
      wqa.clearDivs('wait',titles,optionsO);
    
    $.ajax({
      url: API_URL,
      dataType: "jsonp",
      cache: true,
      data: mydata,

      success: function(result, status){
        vpr.vprint("wiki","listCategories CALLBACK  = =  START  = =  options?"+vpr.dumpvar(optionsO));
        if(result.query==null){
          vpr.vprint("wiki","listCategories CALLBACK NOTHING FOUND, try category["+titles+"]:"+vpr.dumpvar(result));
          //wqa.mkCatLinks([titles]);
          titleA = titles.split(/\|/);
          if(titleA.length>1)
            titles=titleA[1]; //category only
          wqa.openSearch(pageId,titles);
          }
        else{
          var pageA = result.query.pages;
          var catA=[];
          var pagA=[];
          var jpgA=[];  
          var catmin=0,catmax=3;
          var filmin=0,filmax=3;
          var pagmin=0,pagmax=3;
          var sizmin=0,sizmax=3;
      var totpages = vpr.size(pageA);
          vpr.vprint("wiki","listCategories CALLBACK GOT num pages:"+totpages);
            for(key in pageA){
              var infoA = pageA[key];
        if(totpages<50)
              vpr.vprint("wiki","listCategories CALBACK page["+key+"] GOT:"+infoA.title);
              if(infoA.title.match(/^Category:/i))
                catA.push(infoA);
              else // a page
                pagA.push(infoA);
              } //end initial pageA
            vpr.vprint("wiki","listCategories[pageid:"+pageId+" title:"+titles+"] DONE num cats:"+catA.length+" pages:"+pagA.length+" jpgA:"+jpgA.length);
            if(catA.length>=1)
              wqa.mkPageLinks(catA,{isCat:true, divider:' | ',label:'Sub Categories:'});
            if(pagA.length>=1) //20170409 evidence to change this to getThumbsOneshot IN pagelinks(testing with mule then click mule)
              wqa.mkPageLinks(pagA,{divider:' | ',label:'Sub Pages:'});  
            if(jpgA.length>=1)
              wqa.getThumbsForPage(null,jpgA);
      if((jpgA.length>=200 || jpgA.length<10) && pageId!=null) // too many or too few,  list good ones
        wqa.getQuality(pageId,null);
            if(titles!=null && (catA.length>=1||pagA.length>=1||jpgA.length>=1))  // found stuff try morelike
              wqa.moreLike(pageId, titles.replace(/^Category\:/,""));
          }
        }, // end success
      error: function(xhr, result, status){
        vpr.vprint("wiki","listCategories:Error "+status+","+result+","+vpr.dumpvar(xhr));
      }
    });
  }; // end listCategories
  
    
  /**
   mkPageLink - make a page/category link, this function makes DIV WRITES
      options {
     divider : [break|pipe]
     label:  "some text to start with"
   }
   expect like this: "128590":{"pageid":128590,"ns":0,"title":"Akira (film)"}
   
   called by
   */
  wqa.mkPageLinks = function(infoA,optionsO) {
    var linksDiv=(optionsO && optionsO.linksDiv)?optionsO.linksDiv:wqa.linksDiv;
    var zt; // TEXT not Object
    if(typeof infoA!="object")
      infoA = [infoA];
    vpr.vprint("wiki","mkPageLinks = = START = = "+infoA.length+" options:"+vpr.dumpvar(optionsO));
  if(linksDiv.need2clear){
    linksDiv.need2clear=false;
    linksDiv.html('');
    vpr.vprint("wiki","mkPageLinks X X CLEAR WAIT");
    }
    divider="<br>";
    if(optionsO && optionsO.divider!=null)
      divider=optionsO.divider;

    if(optionsO && optionsO.label!=null)
      linksDiv.append($("<h2>").text(optionsO.label)); //// < - - W R I T E   TO   D I V 
    //
  	// LOOP  LOOP
    //
    for(ii=0;ii<infoA.length;ii++){
      if(typeof infoA[ii]!="object")
        zt=infoA[ii];
      else
        zt=infoA[ii].title;
      extrastyle="";
      if(optionsO && optionsO.fontsizekey!=null && infoA[ii].categoryinfo!=null){
        zsize = 10+infoA[ii].categoryinfo[optionsO.fontsizekey]*optionsO.fontscalerange;
				if(size > 35)
					size = 35;
        extrastyle=' style="font-size:'+zsize+'px;" ';
        }
      vpr.vprint("wiki","mkPageLinks:"+zt+" type:"+typeof(infoA[ii])+" have pageid:"+infoA[ii].pageid);
      //these will be categories
      // wqa.listCategories(pageId,"Category:"+pageO.title,thumbsDiv, error);
      if(optionsO && optionsO.isCat) //// < - - W R I T E   TO   D I V 
        linksDiv.append('<a title="'+zt+'" href="javascript:vpr.noop()" onClick="'+API_NAME+'.listCategories('+infoA[ii].pageid+',\''+(zt.replace(/ /g,"_").replace(/'/g,"\\'"))+'\',{clear:true})" >'+zt.replace(/^Category:/,"").replace(/_/g," ")+'</a>'+divider);
      else if(infoA[ii].pageid!=null)
        linksDiv.append('<a title="'+zt+'" href="javascript:vpr.noop()" onClick="'+API_NAME+'.getSectionsForPage(\''+String(infoA[ii].pageid).replace(/'/g,"\\'")+'\',\''+zt+'\',{clear:true})" >'+zt.replace(/^Category:/,"").replace(/_/g," ")+'</a>'+divider);
      else //wqa.queryTitles(newtext);
        linksDiv.append('<a title="'+zt+'" href="javascript:vpr.noop()" onClick="'+API_NAME+'.queryTitles(\''+String(zt).replace(/'/g,"\\'")+'\',{clear:true})" >'+zt.replace(/^Category:/,"").replace(/_/g," ")+'</a>'+divider);
      }
    } // end mkPageLinks
    
/**
  moreLike - Search using moreLike api.  Returns an array of search results.
	example call:
		https://en.wikiquote.org/w/api.php?action=query&redirects=resolve&list=search&srsearch=morelike:Xun_Zi&srlimit=10&srprop=size&formatversion=2
	response:
  {
    "batchcomplete": true,
    "continue": {
        "sroffset": 10,
        "continue": "-||"
    },
    "query": {
        "searchinfo": {
            "totalhits": 5445
        },
        "search": [
            {
                "ns": 0,
                "title": "Sage (philosophy)",
                "size": 2994
            },
   
ref 
    https://www.mediawiki.org/wiki/API:Search_and_discovery
    https://www.mediawiki.org/wiki/API:Search                    for srprop
 */
  wqa.moreLike = function(pageId, titles,  optionsO) {
    linksDiv=(optionsO && optionsO.linksDiv)?optionsO.linksDiv:wqa.linksDiv;
    vpr.vprint("wiki","moreLike = =  START = = = ["+titles+"]");
    $.ajax({
      url: API_URL,
      dataType: "jsonp",
      data: {
        format: "json",
        action: "query",
        list: "search",
        srprop: "size",
        srlimit:"30",
        redirects:"resolve",
        srsearch: "morelike:"+titles,
        formatversion:"2"
      },

      success: function(result, status){
        vpr.vprint("wiki","moreLike CALLBACK["+titles+"] found:"+vpr.dumpvar(result));
        pageA=result.query.search; // a list of categories
        catA=[];
        pagA=[];
        for(ii=0; ii< pageA.length; ii++){
            var infoA = pageA[ii];
            //vpr.vprint("wiki","moreLike CALBACK page["+ii+"] GOT:"+infoA);
            if(infoA.title.match(/^Category:/i))
              catA.push(infoA);
            else {
              pagA.push(infoA);              
              }

            } //end for
        vpr.vprint("wiki","moreLike  * * DONE * * num cats:"+catA.length+" pages:"+pagA.length);
        if(catA.length>=1)
          wqa.mkPageLinks(catA,{isCat:true, divider:' | ',label:'Suggested:'}); //< this is rare
        if(pagA.length>=1)
          wqa.mkPageLinks(pagA,{divider:' | ',label:'Suggested Pages:'});
      },
      error: function(xhr, result, status){
        vpr.vprint("wiki","moreLike Error for "+status+","+result+","+vpr.dumpvar(xhr));
      }
    });
  }; // end moreLike    

  /**
   queryTitles - Query based on "titles" parameter and return page id.
   If multiple page ids are returned, choose the first one.
   Query includes "redirects" option to automatically traverse redirects.
   All words will be capitalized as this generally yields more consistent results.
   example call:
   https://commons.wikimedia.org/w/api.php?format=json&action=query&redirects=&titles=Horse+breeds&_=1491648441494
   
   RETURN:
   {"batchcomplete":"","query":{"pages":{"1721822":
           {"pageid":1721822,"ns":0,"title":"Horse breeds"}
}}}
   */
  wqa.queryTitles = function(titles,optionsO) {
  linksDiv=(optionsO && optionsO.linksDiv)?optionsO.linksDiv:wqa.linksDiv;
  vpr.vprint("wiki","queryTitles = = START = = "+titles);
  if(optionsO && optionsO.clear)
      wqa.clearDivs('wait',titles,optionsO);
    $.ajax({
      url: API_URL,
      dataType: "jsonp",
      data: {
        format: "json",
        action: "query",
        redirects: "",
        titles: titles
      },

      success: function(result, status) {
        var pages = result.query.pages;
        var pageId = -1;
        vpr.vprint("wiki","queryTitles CALLBACK["+titles+"] got:"+vpr.dumpvar(result));
        for(var key in pages) {
          var page = pages[key];
          // api can return invalid recrods, these are marked as "missing"
          if(!("missing" in page)) {
            pageId = page.pageid;
            break;
          }
        }
        if(pageId > 0) {
          wqa.getSectionsForPage(pageId,titles);
        } else {
          vpr.vprint("wiki","queryTitles CALLBACK * *  No results  * *  , try opensearch on:"+titles);
          wqa.openSearch(pageId,titles,{feelinglucky:true});
        }
      },

      error: function(xhr, result, status){
        vpr.vprint("wiki","queryTitles:Error:"+status+","+result+","+vpr.dumpvar(xhr));
      }
    });
  }; // end queryTitles



  /**
   getSectionsForPage - Get the sections for a given page.
   This makes parsing for quotes more manageable.
   Returns an array of all "1.x" sections as these usually contain the quotes.
   20170325 TVs and Movies often break this convention so always put a "more" link

   input:
   https://en.wikiquote.org/w/api.php?format=json&action=parse&prop=sections&pageid=2
   
   example einstein
{"parse":{"title":"Albert Einstein","pageid":2,

"sections":[{"toclevel":1,"level":"2","line":"Quotes","number":"1","index":"1","fromtitle":"Albert_Einstein","byteoffset":893,"anchor":"Quotes"},{"toclevel":2,"level":"3","line":"1890s","number":"1.1","index":"2","fromtitle":"Albert_Einstein","byteoffset":1074,"anchor":"1890s"},{"toclevel":2,"level":"3","line":"1900s","number":"1.2","index":"3","fromtitle":"Albert_Einstein","byteoffset":1442,"anchor":"1900s"},{"toclevel":2,"level":"3","line":"1910s","number":"1.3","index":"4","fromtitle":"Albert_Einstein","byteoffset":4931,"anchor":"1910s"},{"toclevel":2,"level":"3","line":"1920s","number":"1.4","index":"5","fromtitle":"Albert_Einstein","byteoffset":15092,"anchor":"1920s"},{"toclevel":2,"level":"3","line":"1930s","number":"1.5","index":"6","fromtitle":"Albert_Einstein","byteoffset":29066,"anchor":"1930s"},

   20170318 if h3 or h2 has "disputed" stop processing!!!!!!
       appears the id will be "Quotes" for the actual quotes
       
if no sections
{"parse":{"title":"Kill Bill","pageid":10445,"sections"
:[]}}
   */
  wqa.getSectionsForPage = function(pageId,titles,optionsO) {
  if(optionsO && optionsO.clear) // do clear
    wqa.clearDivs('wait',titles,optionsO);
  vpr.vprint("wiki","getSectionsForPage  = =  START  = =  :pageId:"+pageId+" titles:"+titles);
  var mydata={
        format: "json",
        action: "parse",
        prop: "sections",
        pageid: pageId
      };
   if(pageId==null){// swap titles for pageids
    vpr.vprint("wiki","getSectionsForPage = =  PAGE MODE:"+titles);
    mydata['page']=titles;
    delete mydata['pageid'];
    }
  $.ajax({
      url: API_URL,
      dataType: "jsonp",
      data: mydata,
// example movie :   {"toclevel":1,"level":"2","line":"Simba","number":"1","index":"1","fromtitle":"The_Lion_King","byteoffset":618,"anchor":"Simba"}
// example einstein: {"toclevel":2,"level":"3","line":"1910s","number":"1.3","index":"4","fromtitle":"Albert_Einstein","byteoffset":4931,"anchor":"1910s"}
      success: function(result, status){
        vpr.vprint("wiki","getSectionsForPage CALLBACK START :pageId:"+pageId+" titles:"+titles);
        var section1A = [];
        var sectionA = [];
        var sections = result.parse.sections;
        var fromtitle="nada";
        var quotesAreIn=-1;
        if(pageId==null)
          pageId=result.parse.pageid;
        if(sections.length==0){
          vpr.vprint("wiki","getSectionsForPage CALLBACK zero sections, guessing a redirect!");
          wqa.findRedirect(null,titles);
          return;
          }
        else{
          for(var s in sections) {
            vpr.vprint("wiki","getSectionsForPage["+pageId+"] CALLBACK section["+s+"] GOT:"+vpr.dumpvar(sections[s]));
            if(sections[s].fromtitle!=null) // FROMTITLE
              fromtitle=sections[s].fromtitle;
            if(sections[s].anchor=="Quotes") // ANCHOR alternate? try line
              quotesAreIn=sections[s].number;
            if(sections[s].anchor!="External_links" && sections[s].anchor!="Notes")
              sectionA.push(sections[s].index);
            var splitNum = sections[s].number.split('.');
            if(splitNum.length > 1 && splitNum[0] === "1") {
              section1A.push(sections[s].index);
            }
          }
        }

        //success({ titles: result.parse.title, sections: sectionArray });
        //CALLBACK section[0] GOT:{"toclevel":1,"level":"2","line":"Quotes","number":"1","index":"1","fromtitle":"Xun_Zi","byteoffset":313,"anchor":"Quotes"}
        //{"toclevel":1,"level":"2","line":"Quotes","number":"1","index":"1","fromtitle":"Julius_Caesar","byteoffset":904,"anchor":"Quotes"}
        if(sectionA.length==0)
          secRatio =.9999;
        else
          secRatio = section1A.length/sectionA.length;
        vpr.vprint("wiki","getSectionsForPage CALLBACK * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *");
        vpr.vprint("wiki","getSectionsForPage CALLBACK * * DONE * * (page:"+pageId+") num sectionOne:"+section1A.length+" all sections:"+sectionA.length+" ratio:"+secRatio+" fromtitle:"+fromtitle+" quotesAreIn:"+quotesAreIn);
        //sectionIndex=sectionArray[0];
        if(quotesAreIn>0)
          wqa.getQuotesForSection(pageId, [quotesAreIn],"stdquotes"); // anchor says quotes here
        else if(secRatio>.6)
          wqa.getQuotesForSection(pageId, [1]); // deduce  quotes in sec 1, looks like standard
        else
          wqa.getQuotesForSection(pageId, sectionA); // looks like tv/movie
        if(fromtitle!="nada")
          wqa.moreLike(pageId, fromtitle);
      },
      error: function(xhr, result, status){
        error("getSectionsForPage:Error getting sections");
      }
    });
  }; // end getSectionsForPage
  /*
   quoteReady - strip html and display the quote
  */ 
   wqa.quoteReady=function(newQuoteO) {
     var alltext='',numskip=0;
    thumbsDiv=(newQuoteO && newQuoteO.thumbsDiv)?newQuoteO.thumbsDiv:wqa.thumbsDiv;
  if(thumbsDiv.need2clear){
    thumbsDiv.need2clear=false;
    thumbsDiv.html('');
    vpr.vprint("wiki","quoteReady X X CLEAR WAIT");
    }
    if(newQuoteO!=null) {
      // put them in the div
      vpr.vprint("wiki","quoteReady: got a quote:"+vpr.dumpvar(newQuoteO));
      console.log("titles:"+newQuoteO.titles+" num quotes:"+newQuoteO.quotes.length);
      if(thumbsDiv.html()==''){
        thumbsDiv.append('<input id="'+API_NAME+'newlines" type="checkbox" value="newlines" onClick="'+API_NAME+'.toggleNewlines(jQuery(this).prop(\'checked\'))" > keep newlines ');
        if(newQuoteO.specialflags.match(/stdquote/))// <  -  -  WRITE TO DIV
          thumbsDiv.append('<input id="'+API_NAME+'attribute" type="checkbox" value="'+"- "+newQuoteO.titles+'" checked> attribute to: ');
        else 
          thumbsDiv.append('<input id="'+API_NAME+'attribute" type="checkbox" value="'+"- "+newQuoteO.titles+'" > attribute to: ');
        
        thumbsDiv.append($("<span>").text("- "+newQuoteO.titles) );
        }
      //
      // LOOP
      for(ii=0; ii<newQuoteO.quotes.length; ii++){
        zqt=newQuoteO.quotes[ii];
        // strip html but NOT secure, xss vulnerable, but from API OK
        //  http://stackoverflow.com/questions/295566/sanitize-rewrite-html-on-the-client-side/430240#430240
        zqt = $("<p>").html(zqt).text();
        if(zqt.length>355 || zqt.length < 4)
          numskip++;//skip it
        else
          // debug  alltext+= "["+ii+"]"+zqt+'<br>';
          alltext+= '<li>'+zqt+'</li>';
        } // end for
      vpr.vprint("wiki","quoteReady: DONE skipped: "+numskip+" out of:"+newQuoteO.quotes.length);
      thumbsDiv.append($('<ul>').html(alltext)); // <  -  -  WRITE TO DIV
      thumbsDiv.find('li').on('click',vpr.wkUseQuote);
      }
    else
      console.log("quoteReady:no quotes!");
    } // end quoteReady
  /**
   getQuotesForSection - Get all quotes for a given section.  
   args:
   pageId - ignored
   sectionA - array of sections
   callbackflag - [stdquotes]
   
   example call:
   https://en.wikiquote.org/w/api.php?format=json&action=parse&noimages=&pageid=2&section=2
   
   Most sections will be of the format:
   
   * <h3> title </h3>
   * <ul>
   *   <li> 
   *     Quote text
   *     <ul>
   *       <li> additional info on the quote </li>
   *     </ul>
   *   </li>
   * <ul>
   * <ul> next quote etc... </ul>
   *
   * The quote may or may not contain sections inside <b /> tags.
   *
   * For quotes with bold sections, only the bold part is returned for brevity
   * (usually the bold part is more well known).
   * Otherwise the entire text is returned.  Returns the titles that were used
   * in case there is a redirect.
   
   20170318 it appears to be getting all text for page with the .text["*"], have to check wiki api to fix 
   
   */
  wqa.getQuotesForSection = function(pageId, sectionA, callbackflag) {
    for(ii=0;ii<sectionA.length;ii++){
      sectionIndex=sectionA[ii];
      if(sectionIndex>4 && (sectionIndex == sectionA.length-1 || sectionIndex == sectionA.length-2) ){ // now filtered before handler
        vpr.vprint("wiki","getQuotesForSection section["+sectionIndex+"] canidate to skip???????????????????");
        //continue; // skip "see also", "external references"
        }
      vpr.vprint("wiki","getQuotesForSection["+ii+" of "+sectionA.length+"]>"+sectionIndex+" = = START = = pageid:"+pageId);
      mydata = {
          format: "json",
          action: "parse",
          prop:"text|categories|links|sections|displaytitle|properties",// text seems to suck images too
          disabletoc:true,
          pageid: pageId,
          section: sectionIndex
        };
      if(callbackflag!=null)// we can find it in the error msg! currently: [stdquotes]
          mydata[callbackflag]="1";
      $.ajax({
        url: API_URL,
        dataType: "jsonp",
        data: mydata ,

      success: function(result, status){
        if(result==null || result.parse==null || result.parse.text==null)
          vpr.vprint("wiki","getQuotesForSection CALLBACK got nothing!"+vpr.dumpvar(result));
        else {
        var quotes = result.parse.text["*"];
        var specialflags = "none";
        if(result.warnings && result.warnings.main)
          specialflags =result.warnings.main["*"];//"warnings":{"main":{"*":"Unrecognized parameter: userdata."}}
        var quoteArray  = [];
        var quoteArrayr = [];
        var quoteArrayb = [];
        var quoteArrayl = [];
        //
        vpr.vprint("wiki","getQuotesForSection CALLBACK keys:"+vpr.iterate(result.parse,null,"getkeys"));
        vpr.vprint("wiki","getQuotesForSection CALLBACK sections:"+vpr.dumpvar(result.parse.sections));
        secline=result.parse.sections[0].line;
        if(secline=="Cast"){
          vpr.vprint("wiki","getQuotesForSection CALLBACK skip section"+secline);
          return;
        }
        // TV movies have lots of descriptions lists for dialogue
        /* <dl>
						<dd><b>Simba</b>: Hey, Uncle Scar, when I'm king, what'll that make you?</dd>
						<dd><b>Scar</b>: A monkey's uncle.</dd>
						<dd><b>Simba</b>: <i>[laughs]</i> You're so weird!</dd>
						<dd><b>Scar</b>: You have no idea.</dd>
						</dl>
						*/
        // Find top level <li> only
        var $tocfree = $('<div></div>').html(quotes);// use disabletoc .find('*[id!=toc]');
        var $lis = $tocfree.find('li:not(li li)'); // this gets rid of explainations /attributes: One of Bilbo's riddles for Gollum. The answer is "teeth".
        var $dls = $tocfree.find('dl');
        var $lns = $tocfree.find('li>a,li>i>a'); // often li>i>a
        
        $('#debugbox').val($tocfree.html());
        // put in debugbox
        vpr.vprint("wiki","getQuotesForSection CALLBACK ==========================================================================");
        vpr.vprint("wiki","getQuotesForSection CALLBACK rawquotesize:"+quotes.length+" lis:"+$lis.length+" dls:"+$dls.length+" lns:"+$lns.length+" specialflags:"+specialflags);
        // for this: https://en.wikiquote.org/wiki/List_of_films_(A%E2%80%93C)
        // ITALICS links are in italic  <i><a href="/wiki/Akira" class="mw-redirect" title="Akira">Akira</a></i>
        // A) hobbit riddles are italic < WANT it
        // B) Lion king quote embelishments are in italics  < DO NOT WANT
        if  (secline=="See also" || ($lns.length >0 && $lns.length > $lis.length && !specialflags.match(/stdquote/))){ // dls   links                         LINKS
          $lns.each(function() {
            //fullquote =$(this).prop('href'); this gets transformed to full path
            fullquote =$(this).text();
            if($(this).prop('title').match(/page does not exist/i))
              vpr.vprint("wiki","getQuotesForSection_LINKS skip missing page link");//skip
            else if($(this).prop('href').match(/wikipedia/i))
              vpr.vprint("wiki","getQuotesForSection_LINKS skip missing wikipedia link");//skip
            else
              quoteArrayl.push(fullquote.replace(/ /g,"_"));
            });
          }
        else if ($lis.length >= $dls.length)   //    quotes               QUOTES 
          $lis.each(function() {
            onlyi = ($(this).find('i').length ==1)?true:false;     
            // old   $BnI =   $(this).find('b:not(li>b),i:not(li>i)')
            var $BnI =  (specialflags.match(/stdquote/))?  $(this).children('b'):$(this).children('b,i');   // with toc change was not working on GBS, in fact want top level b and i
            //var $BnI = $(this).find('li>b,li>i');     //should be in <li> A)  b or i
            vpr.vprint("wiki","getQuotesForSection_QUOTES CALLBACK num BnI:"+$BnI.length+" onlyI?:"+onlyi);
            // If the section has bold text, use it.  Otherwise pull the plain text.
            if(onlyi && !specialflags.match(/stdquote/)) // have a single italic, treat as regular, grab it all
              quoteArrayr.push($(this).html());
            else if($BnI.length >=1) {
              //$(this).children().remove(':not(b,i)');// If we have some bolds Remove all children that aren't <b>
              fullquote="";
              $BnI.each(function() {
                fullquote+=$(this).html()+" ";
              });
              quoteArrayb.push(fullquote);
              }
            else {
              //20170318 CMM we only want what is considered famous !
              quoteArrayr.push($(this).html());
            }
          });
        else { // dls   movie/dialog                         MOVIE/DIALOG
          // sometimes the dl is a combined block quote sometimes NOT
          $dls.each(function() {
            // Remove all children that aren't <b>
            fullquote =$(this).text();
            quoteArrayr.push(fullquote);
            });
          vpr.vprint("wiki","getQuotesForSection_DIALOG dls packed up this many:"+quoteArrayr.length);
          }
        // end parse
        vpr.vprint("wiki","getQuotesForSection CALLBACK done BOLDS:"+quoteArrayb.length+" regular:"+quoteArrayr.length+" links:"+quoteArrayl.length);
        if(quoteArrayl.length>0){
          vpr.vprint("wiki","getQuotesForSection CALLBACK found some links");
          wqa.mkPageLinks(quoteArrayl);
          }
        else { //quotes
          quoteArray = quoteArrayb;
          if(quoteArray.length<5){// add on
            quoteArray =  quoteArray.concat(quoteArrayr);
            }
          //                                                < < - -   DISPLAY  QUOTES
          wqa.quoteReady({titles: result.parse.title, 
                          quotes: quoteArray,
                          specialflags: specialflags }); // < < - -   DISPLAY  QUOTES
        }// end quotes
        }// end had result
      },// end success
      error: function(xhr, result, status){
        error("getQuotesForSection:Error getting quotes");
      }
    });// end ajax
    }// end loop sections
  };// end getQuotesForSection
  
  /**
   getWikiForSection - Get Wikipedia page for specific section
   Usually section 0 includes personal Wikipedia page link
   ref:  https://www.mediawiki.org/wiki/API:Parsing_wikitext
   */
  wqa.getWikiForSection = function(title, pageId, sec, success, error) {
    $.ajax({
      url: API_URL,
      dataType: "jsonp",
      data: {
        format: "json",
        action: "parse",
        prop:"text|categories|links|sections|displaytitle|properties",
        disabletoc:true,
        pageid: pageId,
        section: sec
      },

      success: function(result, status){
    
        var wikilink;
    console.log('getWikiForSection CALLBACK what is iwlink:'+result.parse.iwlinks);
    var iwl = result.parse.iwlinks;
    for(var i=0; i<(iwl).length; i++){
      var obj = iwl[i];
      if((obj["*"]).indexOf(title) != -1){
         wikilink = obj.url;
      }
    }
        success(wikilink);
      },
      error: function(xhr, result, status){
        error("getWikiForSection:Error getting quotes");
      }
    });
  }; // end

  /**
   toggleNewlines - add/remove newlines (<br>)
   */
  wqa.toggleNewlines= function(ischecked){
    //ischecked = $('#'+API_NAME+'newlines').prop('chekced');      
    //alert("toggleNewlines checked?:"+ischecked);
    wqa.thumbsDiv.find('li').each(function(){
      cur=$(this).html();
      if(ischecked)
        $(this).html(cur.replace(/\n/g,"<br>\n") );
      else
        $(this).html(cur.replace(/<br>/g,"") );
    });
    }


  /**
   capitalizeString - Capitalize the first letter of each word
   */
  wqa.capitalizeString = function(input) {
    var inputArray = input.split(' ');
    var output = [];
    for(s in inputArray) {
      output.push(inputArray[s].charAt(0).toUpperCase() + inputArray[s].slice(1));
    }         
  stemp = output.join(' ');
	stemp = stemp.replace(/\&#8217;/g,"'").replace(/[\u2018\u2019]/g,"'"); // fancy quot to singlequote

    return stemp;
  };
  /**
   catagorizeString - Capitalize the first letter of each word
   20170321 cmm only do very first letter, test case: Pine cone  alternative is Pine cone|Pine Cone
   */
  wqa.catagorizeString = function(input) {
    var inputArray = input.split(' ');
    var output = [];
    stemp = input.charAt(0).toUpperCase()+ input.slice(1);
  
    for(s in inputArray) {
      // 20170413 sometimes want uppercase, sometimes dont charAt(0).toUpperCase()
    output.push(inputArray[s].charAt(0) + inputArray[s].slice(1));
    }
    return 'Category:'+output.join('_');
  };
  /**
   clearDivs - clear out divs show wait icon and handle history stack
   args - mode =[wait|regular] for wait, show spinner
        - title, NeW title to be loaded
   */
  wqa.clearDivs= function(mode,title,optionsO){
    vpr.vprint("wiki","X X X X X X X X X X X X clearDivs("+mode+") X X X X X X X X X X X X");
    clearwith =(wqa.waiticon !=null && mode=="wait")?wqa.waiticon:'';
    if(mode=="wait") {// store up * HISTORY *
      if(wqa.linksDiv.html()!=''){
        //alert("history push! from size:"+historyA.length);
        historyA.push(wqa.linksDiv.html());
        historytA.push(wqa.thumbsDiv.html());
        if(optionsO && optionsO.setPrevSearch) { //TYPED input search: use presearch
          historyiA.push(prevsearch );
          prevsearch = wqa.inputEl.val();
          }
    else{ //                                  CLICK link search
          historyiA.push(wqa.inputEl.val() );// save CURRENT title
      // set NEW title ... strip any Category: or underscore
      wqa.inputEl.val(title.replace(/^Category:/,"").replace(/_/g," "));
      prevsearch =title.replace(/^Category:/,"").replace(/_/g," ");
      }
        $('#'+API_NAME+'goback').removeClass('gnlv-gone');
        } // end links not empty
      } // end wait mode
  if(dontclearcats>0){ // this is used for category disambiguation, usually cant come in before
    dontclearcats--;
    vpr.vprint("wiki","X X  clearDivs.linksDiv had a dont clear flag!:"+dontclearcats);
    }
  else {
      wqa.linksDiv.html(clearwith);  // < - -  - CLEAR
        if(mode=="wait")
          wqa.linksDiv.need2clear=true;
        }
      wqa.thumbsDiv.html(clearwith);     // < - -  - CLEAR
      if(mode=="wait")
        wqa.thumbsDiv.need2clear=true;
    }// end clearDivs
  /**
   goBackl - pop history stacks and load to appropriate divs
   */
  wqa.goBackl= function(){
    if(historyA.length==0)
      return;
    else if(historyA.length==1) // last pop
      $('#'+API_NAME+'goback').addClass('gnlv-gone');      
    //alert("goBackl going back from size:"+historyA.length);
    wqa.linksDiv.html(historyA.pop());
    wqa.thumbsDiv.html(historytA.pop());
    prevsearch=historyiA.pop();
    wqa.inputEl.val(prevsearch);
    }
  /**
  getLastSearch - get last item on history stack
   */
  wqa.getLastSearch= function(){
    return prevsearch;
    //return(historyA[historyA.length-1]) 
    }
  //return wqa;
};
