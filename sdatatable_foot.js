/**********
*
* ScrollingDataTable with Footer for YUI 2
* Author: Todd Smith  
*         YUILibrary user : stlsmiths (http://yuilibrary.com/forum/memberlist.php?mode=viewprofile&u=5872)
* <br/>
* @module DataTableSF
* @requires yahoo, dom, event, element, datasource, datatable
* @title DataTableSF Widget
* 
*  To implement, add the following to the DataTable configs object,
*  						
*	tfooter:{
*				fixed:		true,
*				heading:	{ colspan:9, label:"TOTALS ( {ROW_COUNT} positions ) :", className:'align-center' }, 
*				col_keys:	[
*								{ key:'s_cbasis', 	calc:'{SUM}', formatter:"currency" },	
*								{ key:'s_mvalue', 	calc:'{SUM}' }, 
*								{ key:'gl', 		func: pos_gl_calc, 		formatter:"number" },
*								{ key:'glperc', 	func: pos_glperc_calc, 	formatter:"number" },
*								{ key:'delete',		exclude:true },
*								{ key:'edit',		exclude:true }																					
*							]
*			}  // end of tfooter  
*
*  "calc" properties recognized include; {SUM},{AVG},{MEAN},{MAX},{MIN},{ROW_COUNT}
*   
*  CSS :  The footer is rendered using the 'yui-dt-ft' style (which by default, I copied from the ... 'yui-dt-hd' style)
* 
***********/
(function(){

    var Dom = YAHOO.util.Dom,
		Event = YAHOO.util.Event,
		Lang = YAHOO.lang,
		ua = YAHOO.env.ua,
		DT = YAHOO.widget.DataTable,
		SDT = YAHOO.widget.ScrollingDataTable;

		
    /**
    * The DataTableSF class extends the ScrollingDataTable class to provide
    * for the ability to add either fixed or scrolling TFOOT elements for table.
    *
    * @namespace YAHOO.widget
    * @class DataTableSF
    * @extends YAHOO.widget.ScrollingDataTable
    * @constructor
    * @param elContainer {HTMLElement} Container element for the TABLE.
    * @param aColumnDefs {Object[]} Array of object literal Column definitions.
    * @param oDataSource {YAHOO.util.DataSource} DataSource instance.
    * @param oConfigs {object} (optional) Object literal of configuration values.
    */
    var DTSF = function(elContainer,aColumnDefs,oDataSource,oConfigs) {

        DTSF.superclass.constructor.call(this, elContainer,aColumnDefs,oDataSource,oConfigs); 

    };
	
	YAHOO.widget.DataTableSF = DTSF;

	// Copy over DataTable constants and other static members
	Lang.augmentObject(DTSF, SDT);
		
    Lang.extend( DTSF, SDT, 
        {
			/**
			 * Container for footer TFOOT element
			 * 
			 * @property _elFootContainer
			 * @type HTMLElement
			 * @private
			 */
			_elFootContainer:	null,	// holder for footer <DIV> element, below main TABLE (for fixed option)
			_elFootTable:		null,	// holder for footer <TABLE> element, below main TABLE (for fixed option)
			_elFootEl:			null,   // holder for <TFOOT> element
			_elFootRow :		null,	// holder for <TR> element 
			_elFootTH :			null,
			_elFootTHLinerEl :	null,
			_Foot_colopts :		null,	// this array of objects contains all *important* column related parameters
		
			_tfooter_config: null,
			
			CLASS_FOOTER	:	'yui-dt-ft',

    /////////////////////////////////////////////////////////////////////////////
    //
    // Private methods
    //
    /////////////////////////////////////////////////////////////////////////////

			/**
			 * OVERRIDE
			 * Initializes DOM elements for a ScrollingDataTable, including creation of
			 * two separate TABLE elements.
			 * 
			 * REVISED here to also provide for adding TFOOT via call to _initTFootEl. 
			 *
			 * @method _initDomElements
			 * @param elContainer {HTMLElement | String} HTML DIV element by reference or ID. 
			 * return {Boolean} False in case of error, otherwise true 
			 * @private
			 */
			_initDomElements : function(elContainer) {
			    // Outer and inner containers
			    this._initContainerEl(elContainer);
			    if(this._elContainer && this._elHdContainer && this._elBdContainer) {
			        // TABLEs
			        this._initTableEl();
			        
			        if(this._elHdTable && this._elTable) {
			            // COLGROUPs
			            ///this._initColgroupEl(this._elHdTable, this._elTable);  
			            this._initColgroupEl(this._elHdTable);        
			            
			            // THEADs
			            this._initTheadEl(this._elHdTable, this._elTable);
			            
			            // Primary TBODY
			            this._initTbodyEl(this._elTable);
			            // Message TBODY
			            this._initMsgTbodyEl(this._elTable);
						
					//  Adds TFOOT, either as new Table (fixed) or appends (floating with scroll)
						if ( this._tfooter_config )
							this._initTFootEl( this._elContainer );            
			        }
			    }
			    if(!this._elContainer || !this._elTable || !this._elColgroup ||  !this._elThead || !this._elTbody || !this._elMsgTbody ||
			            !this._elHdTable || !this._elBdThead) {
			        YAHOO.log("Could not instantiate DataTable due to an invalid DOM elements", "error", this.toString());
			        return false;
			    }
			    else {
			        return true;
			    }
			},



						
			/**
			 * OVERRIDE
			 * Initialize internal event listeners
			 *
			 * @method _initEvents
			 * @private
			 */
			_initEvents: function () {
				DTSF.superclass._initEvents.call(this);
				
                if ( this._tfooter_config ) {
	                this.on( 'refreshEvent', function() {
						if ( this._elFootTH === null ) 
							this.renderFooter();
						else
							this.refreshFooter();
					} );
					
					YAHOO.log("Subscribed to 'refreshEvent' in _initEvents","info");

                }
			},



			/**
			 * Adjusts the size of the footer TD cell based upon the size settings of the 
			 * underlying DataSet columns. 
			 * 
			 * This function accounts for the TH (header) and any colspan merging defined.
			 * 	
             * @method _sizeFootCell
             * @param elCell  {HTMLElement} The liner DIV element within the footer TD 
             * @param oColumn {YAHOO.widget.Column | YAHOO.widget.ColumnSet} The column instance
             *  or the ColumnSet (for TH element) 
             * @private
             * 
             * @called_by renderFooter
			 */
			_sizeFootCell :	function (elCell, oColumn) {
				var width = 0, 
					lwidth=0, 
					max_width=0,
					offleft=null, 
					dt_col=null, 
					tdl=null; 
				
				if ( oColumn && elCell ) {
					
				// Handle the TH cell	
					if ( elCell.colSpan && elCell.colSpan>1 && (oColumn instanceof YAHOO.widget.ColumnSet) ) {
						for(var i=0; i<elCell.colSpan; i++) {
							dt_col = oColumn.keys[i];
							if ( dt_col.hidden === true ) 
								lwidth = 0;
							else {
								tdl = this.getThEl( dt_col ); // this.getTdLinerEl( {record:oRecord, column:dt_col} ); 
								lwidth = Math.max(0,(parseInt(Dom.getStyle(tdl,'width'))|0),
													(tdl.offsetWidth -(parseInt(Dom.getStyle(tdl,'paddingLeft'),10)|0) ));
								lwidth = lwidth || 0;
							}
								
							width += lwidth;
							max_width += (dt_col.maxAutoWidth) ? dt_col.maxAutoWidth : 0;
						}
					} else {
					
				// This is the TD cells	
							dt_col = oColumn;
							if (dt_col.hidden === true) 
								lwidth = 0;
							else {
								tdl = this.getThEl(dt_col);
								if (tdl) {
									lwidth = Math.max(0, (parseInt(Dom.getStyle(tdl, 'width')) | 0), (tdl.offsetWidth - (parseInt(Dom.getStyle(tdl, 'paddingLeft'), 10) | 0)));
									//			lwidth = parseInt(Dom.getStyle(tdl,'width'));
									
									lwidth = lwidth || 0;
									lwidth = 0;
									offleft = tdl.offsetLeft;
								}
							}
							width = lwidth;
							max_width = (dt_col.maxAutoWidth) ? dt_col.maxAutoWidth : 0;
					}

				//
				//  Liner operations
				//
					var elLiner = ( elCell.childNodes.length>0 ) ? elCell.childNodes[0] : elCell;
					
					if ( elLiner && width && width > 0 ) {
						Dom.setStyle(elLiner,'width',width+'px'); 
				//		elLiner.width = width+'px';
						elLiner.width = width;
						if ( offleft ) Dom.setStyle(elLiner,'left',offleft+'px'); 
					}
					
					return elCell;
				}
				
			},
			
			
			/**
			 * Outputs the markup of the footer TD applying either the user-defined 
			 * formatting, the Column formatter or as a last resort DT default formatter.
			 * 	
             * @method _formatFootCell
             * @param elCell 	{HTMLElement} The liner DIV element within the footer TD 
             * @param fnFormatter {DataTable.Formatter} or {String} The formatter to apply  
             * @param oColumn 	{YAHOO.widget.Column} (Optional) The column instance 
             * @param oData   	{Data | Function} Contents for TD, a function can be provided 
             * @private
             * 
             * @called_by renderFooter
			 */
			_formatFootCell :	function( elCell, fnFormatter, oRecord, oColumn, oData) {
			//
			//  determine the default Column formatter, if required
			//	
				var cformatter = typeof oColumn.formatter === 'function' ?
		                          oColumn.formatter :
		                          DT.Formatter[oColumn.formatter+''] ||
		                          DT.Formatter.defaultFormatter;
			//
			//  Check if a formatter was provided as tfooter.col_keys[].formatter
			//					  
				if ( Lang.isString(fnFormatter) )
					fnFormatter = DT.Formatter[fnFormatter];    // it was a string named Formatter ...
									  
		        var localFormatter = (Lang.isFunction(fnFormatter) ) ? fnFormatter : cformatter;
		
				if ( Lang.isFunction(oData) ) 
				    elCell.innerHTML = oData();
				else
			        // Apply special formatter
			        if (localFormatter && oColumn) {
			            localFormatter.call(this, elCell, oRecord, oColumn, oData);
			        }
			        else {
			            elCell.innerHTML = oData;
			        }
			},



			/**
			 * 	Creates the TFOOT element and a single TR as required IF a footer is configured.
			 * 	There are two different scenarios for this;
			 * 	   Case 1 : 
			 * 				If the user desires a "fixed" footer, a new TABLE element is 
			 * 				appended to the DT container (similar to how Scrolling DT does THEAD).  
			 * 	   Case 2 :	
			 * 				If a "non-fixed" or floating footer is desired, a TFOOT is 
			 * 				simply added to the DT container TBODY.
			 *
			 * 	Uses configuration elements in _tfooter_config stored by initAttributes.
			 * 	
             * @method _initTFootEl
             * @param elContainer 	{HTMLElement} The Datatable container element 
             * @private
             * 
             * @called_by _initDomElements (overridden from base)
			 */
			_initTFootEl :  function( elContainer ) {

				var RS = this._oRecordSet, 
					CS = this._oColumnSet,
					elTable = null,
					elFootContainer = null,
					elFootTable = null,
					elFootEl = null, 
					elFootRow = null,
					tf_config = this._tfooter_config; 
			
			
				YAHOO.log("Beginning _initTFootEl","info");
				
				if ( !tf_config ) return;
				
				if (  this._elFootEl  ) this._destroyFootEl();

			//
			//  For FIXED footer, 
			//	   we will add a DIV to the overall container, and then a TABLE element
			//     within the DIV (similar to what ScrollingDataTable does with adding a TABLE 
			//     for the THEAD elements) ...
				
				if ( tf_config.fixed === true && !this._elFootTable ) {

			        elFootContainer = document.createElement("div");
			        elFootContainer.style.width = this.get("width") || "";
					elFootContainer.style.backgroundColor = this.get("COLOR_COLUMNFILLER");
			        Dom.addClass(elFootContainer, this.CLASS_FOOTER );
			        this._elFootContainer = elFootContainer;
					
					elFootTable = document.createElement("table");
					Dom.addClass( elFootTable, this.CLASS_DATATABLE );
			        this._elFootTable = elFootTable;
					
			        elFootContainer.appendChild( elFootTable );
			        elContainer.appendChild( elFootContainer );
					
				} 

			//
			//  Now assign the Table to append to, and create the TFOOT and TR elements
			//
				elTable = ( tf_config.fixed === true ) ? this._elFootTable : this._elTable;

				var elTr=null, elTh=null;
				
				elFootEl = document.createElement('tfoot');
				Dom.addClass( elFootEl,this.CLASS_DATA );
				
				elTr = document.createElement("tr");
				Dom.addClass(elTr, 'yui-dt-last yui-dt-even');


				/*
				 *  Assign an array of objects ( colopts ) for each Column defined by the user,
				 *  in the configuration.
				 *  
				 *   Each colopts is populated and preprocessed with data to be used in the 
				 *   display and updating of the footer.
				 *
				**/
				//	
				// Null each column first
					var colopts = [];
					for (var j=0; j<CS.keys.length; j++) {
						colopts[j] = null;	
					}
					
					for(var i=0; i<tf_config.col_keys.length; i++) {
						var col = CS.getColumn(tf_config.col_keys[i].key);
						
						if ( Lang.isObject(col) ) 
							colopts[ col.getKeyIndex() ] = { 	
							
									key:		tf_config.col_keys[i].key, 
									column:		col, 
									col_index:	col.getKeyIndex(), 
									func:		tf_config.col_keys[i].func || '', 
									calc:		tf_config.col_keys[i].calc || null,
									formatter:	tf_config.col_keys[i].formatter || col.formatter || {},
									fmtOptions:	tf_config.col_keys[i].fmtOptions || null,
									className:	tf_config.col_keys[i].className || col.className || null,
									exclude:	tf_config.col_keys[i].exclude || false,
									idTFLiner:	this.getId() + "-tf-" + col.getSanitizedKey(),
									foot_col:	0,
								//	sum:		0.,
									arg:		0. 
							};
					}  // end if and for


					this._Foot_colopts = colopts;


				this._elFootEl = elFootEl;
				this._elFootRow = elTr;
				elTh = document.createElement("th");

				elFootEl.appendChild( elTr );
				elTable.appendChild( elFootEl )

				YAHOO.log("Exiting _initTFootEl","info");
			},



			/**
			 * Re-calculates the column settings based up the underlying recordset for the footer.
			 * The footer values are calculated and stored in variable "_Foot_colopts" which are 
			 * inserted later by _updateFootTDs function.
			 * 
			 * This function can recognize column keys of either ".calc" or ".func".  
			 * 
			 * The ".calc" keys can be either {SUM}, {MIN}, {MAX}, {AVG}, {MEAN} or {ROW_COUNT} at present.
			 * 
			 * Uses column settings pre-processed and stored in ._Foot_colopts.
			 * 	
             * @method _recalcFooter
             * @private
             * 
             * @called_by renderFooter, refreshFooter
			 */
			_recalcFooter : function() {
				var RS = this.getRecordSet(), 
					colopts = this._Foot_colopts;
				
			//
			//  Loop through the RecordSet, operating on each column
			//	
				for (var i=0; i < RS.getLength(); i++) {
					var rdata = this.getRecord(i).getData();
					for (var j=0; j<colopts.length; j++) {
						if ( colopts[j] ) {
							
							if ( Lang.isString(colopts[j].calc) ) {
								var oData = rdata[ colopts[j].key ];
								if ( !Lang.isNumber(oData) ) oData = 0.0;
							
								var calc_meth = colopts[j].calc.toUpperCase();
								switch( calc_meth ) {
									
									case '{SUM}':
									case '{AVG}':
									case '{MEAN}':
										if ( i === 0 ) colopts[j].arg = 0.;
										colopts[j].arg += parseFloat( oData ) || 0.0;
									//	colopts[j].sum = colopts[j].arg;
										
										if ( (i+1) === RS.getLength() && calc_meth.match(/{AVG}|{MEAN}/) )
											colopts[j].arg = colopts[j].arg/RS.getLength(); 
										break;
										
									case '{MIN}':
										if ( i === 0 ) colopts[j].arg = parseFloat( 100000000. );
										if ( parseFloat(oData) < parseFloat(colopts[j].arg) )
											colopts[j].arg = parseFloat(oData);
										break;
										 
									case '{MAX}':
										if ( i === 0 ) colopts[j].arg = parseFloat( -100000000. );
										if ( parseFloat(oData) >  parseFloat(colopts[j].arg) )
											colopts[j].arg = parseFloat(oData);
										break; 

									case '{ROW_COUNT}':
										if ( i === 0 ) colopts[j].arg = RS.getLength();
										break; 
							//
							// === ADD more 'cases' for other calcs here ...
							//		
									default:
										colopts[j].arg = 'unknown calc field';
																		
								} // end switch
							}  else if ( Lang.isFunction(colopts[j].func) )
								colopts[j].arg = colopts[j].func;
							else
								colopts[j].arg = 'unknown';								
						} // if block
															
					}  // j loop
				} // i loop
				
				YAHOO.log("Exiting _recalcFooter","info");
				
			},


			/**
			 *  Creates the Heading element <TH> in the <TFOOT> section based upon the input 
			 *  configurations including any "colspans" defined to span multiple columns. 
			 *  This method creates the TH and the liner DIV element.

             * @method _createFootTH
             * @private
             * 
             * @called_by _initTFootEl 
			 */
			_createFootTH :  function( elTr ) {
				var tf_config = this._tfooter_config,
					elTh=null, 
					elThLiner=null;
				
				if ( tf_config.heading !== null && Lang.isObject(tf_config.heading)  ) {
					
					elTh = document.createElement("th");
					Dom.setStyle( elTh, 'vertical-align','middle' );
					
					if ( Lang.isNumber(tf_config.heading.colspan) && tf_config.heading.colspan>1 ) {
						elTh.colSpan = tf_config.heading.colspan;
				//		col_start = tf_config.heading.colspan;
					}
					
					elThLiner = document.createElement('div');
					Dom.addClass( elThLiner, this.CLASS_LINER );
						
					elThLiner.id = this.getId()+"-tfoot-th-liner";
					
					if ( tf_config.heading.className ) {
						Dom.addClass( elTh, tf_config.heading.className );
						Dom.addClass( elThLiner, tf_config.heading.className );
					} 

					elTh.appendChild( elThLiner );
					elTh = this._sizeFootCell( elTh, this._oColumnSet );    // hard-code, TH starts in Column 0
					elTr.appendChild( elTh );
					
					this._elFootTH = elTh;
					this._elFootTHLinerEl = elThLiner;
				}

				YAHOO.log("Exiting _createFootTH","info");
			},

			/**
			 * Revises the contents of the TH element of the TFOOT
			 * Can be used if the TH element "label" contains data that needs to be updated based upon 
			 * changes to the underlying RecordSet.
			 * 
			 * The only recognizable replaceable element is {ROW_COUNT} at the present time.  
			 * 	
             * @method _updateFootTH
             * @private
             * 
             * @called_by renderFooter
			 */
			_updateFootTH :	function ( oHeader ) {
				if ( oHeader && oHeader.label && oHeader.label.length>1 ) {
					this._elFootTHLinerEl.innerHTML = Lang.substitute( oHeader.label, { ROW_COUNT:this._oRecordSet.getLength() } );
				}
				YAHOO.log("Exiting _updateFootTH","info");
			},



			/**
			 * 
			 * 	
             * @method _createFootTDs
             * @private
             * 
             * @called_by _initDomElements (overridden from base)
			 */
			_createFootTDs : function( col_start, elTr ) {
				var CS = this._oColumnSet, 
					elCell = null, 
					elLiner = null,
					elTableFirstTr = this.getFirstTrEl(),
					colopts = this._Foot_colopts;
				
				for (var i=col_start; i<CS.keys.length; i++) {
					var loc_col = CS.keys[i];
					
					elCell = document.createElement("td");
					elLiner = document.createElement("div");
					
				// Duplicate the existing TABLE cell class for 
				//   the TFOOT TD elements	
					Dom.addClass( elCell, elTableFirstTr.childNodes[i].className  );
					
					if ( colopts[i] !== null) {
						if ( !colopts[i].exclude ) {
							Dom.addClass(elLiner, 'yui-dt-liner');
							elLiner.id = colopts[i].idTFLiner;
						} else
							elCell = null;
					} else {
						elLiner.innerHTML = ""; //elCell.innerHTML = '';
						elLiner.id = this.getId() + "-tf-nominal" + i; // Needed for accessibility
					}
						
					if ( elCell !== null ) {
						elCell.appendChild( elLiner );
						elCell = this._sizeFootCell( elCell, loc_col );    // hard-code, TH starts in Column 0
						elTr.appendChild( elCell );  
					}	
				}  // end for i
				
				YAHOO.log("Exiting _createFootTDs","info");
			
			},


			/**
			 * 	
             * @method _updateFootTDs
             * @private
             * 
             * @called_by renderFooter, refreshFooter
			 */
			_updateFootTDs :	function( col_start ) {
				var CS = this._oColumnSet; 
		//		var elCell = null, elLiner = null;
				var firstRec = this.getRecordSet().getRecord(0);
		//		var elTableFirstTr = this.getFirstTrEl();
				var colopts = this._Foot_colopts
				
				for (var i=col_start; i<CS.keys.length; i++) {
					var loc_col = CS.keys[i];
					
					if ( colopts[i] !== null) {
						if ( !colopts[i].exclude && colopts[i].idTFLiner ) {
							elLiner = Dom.get( colopts[i].idTFLiner );
							
							var oData = ( Lang.isFunction(colopts[i].arg) ) ? colopts[i].arg() : colopts[i].arg;
							this._formatFootCell( elLiner, colopts[i].formatter, firstRec, colopts[i].column, oData);	
						}  // if not exclude 
					} // if colopts not null
				}  // end for i
				
				YAHOO.log("Exiting _updateFootTDs","info");
				
			},


			/**
			 * Adjusts the TD elements of the TFOOT element if the user changes the 
			 * underlying DataTable column sizes (i.e. dragging, resize). 
			 *
			 * This method accounts for whether the changed Column is already wrapped 
			 * up or merged in a "colspan" or not.
			 * 	
             * @method _updateFooterColumn
             * @param oColumn {YAHOO.widget.Column} (Optional) The column instance 
             * @private
             * 
             * @called_by setColumnWidth
			 */
			_updateFooterColumn : function (oColumn) {
				var elFootRow = this._elFootRow,
					tf_config = this._tfooter_config;

				if (elFootRow && tf_config) {
					var key_index = oColumn.getKeyIndex();
					var foot_colspan = (tf_config && tf_config.heading && tf_config.heading.colspan) ? tf_config.heading.colspan : 1;
					var foot_index = (key_index < foot_colspan) ? 0 : (key_index - foot_colspan) + 1;
					
					var elTh = elFootRow.childNodes[foot_index];
					elTh = this._sizeFootCell(elTh, this.getColumnSet());
				}
			},


			/**
			 * Destroys completely the FOOTER and all children elements, including 
			 * the DIV, TABLE, THEAD and TR elements.  Also accounts 
			 * for whether a new DIV (with TABLE) was created for "fixed" tfooter.  
			 *
			 * @method _destroyFooter
			 * @private
			 */
			_destroyFooter :  function() {

				this._destroyFootEl();
				
				if ( this._tf_configs && this._tf_configs.fixed === true ) {
					
					// Destroy the TABLE  
				    var elTable = this._elFootTable;  
				    if (elTable) {
						Event.purgeElement(elTable, true);
						elTable.parentNode.removeChild(elTable);
					}
					
					// Destroy the outer container DIV  
				    var elCont = this._elFootContainer;  
				    if (elCont) {
						Event.purgeElement(elCont, true);
						elCont.parentNode.removeChild(elCont);
					}
				}

				this._elFootTable = null;
				this._elFootContainer = null;

				YAHOO.log("Exiting _destroyFooter","info");
			},

			
			/**
			 * Destroys the TFOOT's underlying TR row, leaving the TFOOT and TABLE 
			 * elements intact.
			 *
			 * @method _destroyFootRow
			 * @private
			 */
			_destroyFootRow : function() {
			    var elFootRow = this._elFootRow;
			    if( elFootRow ) {
			        var elTableEl = elFootRow.parentNode;
			        Event.purgeElement(elFootRow, true);
			        elTableEl.removeChild(elFootRow);
			        this._elFootRow = null;
			    }
			},
						
			/**
			 * Destroys the TFOOT element, first eliminating the TR element (child) while
			 * leaving the TABLE element intact.
			 *
			 * @method _destroyFootEl
			 * @private
			 */
			_destroyFootEl : function() {
				this._destroyFootRow();
				
			    var elFootEl = this._elFootEl;
			    if( elFootEl ) {
			        var elTable = elFootEl.parentNode;
			        Event.purgeElement(elFootEl, true);
			        elTable.removeChild(elFootEl);
			        this._elFootEl = null;
			    }
			},
			

    /////////////////////////////////////////////////////////////////////////////
    //
    // Public methods
    //
    /////////////////////////////////////////////////////////////////////////////
            /**
             * Over-ridden initAttributes method from DataTable, inherited from Element
             *
             * @method initAttributes
             * @param {Object} configuration attributes taken from the fourth argument to the constructor
             */
            initAttributes : function( oConfigs ) {

                oConfigs = oConfigs || {};

                DTSF.superclass.initAttributes.call( this, oConfigs );

                /**
                 *
                 * Template for the FOOTER
				 *			tfooter:{
				 *				fixed:		true,
				 *				heading:	{ colspan:5, label:"TOTALS ( {ROW_COUNT} positions ) :", className:'align-center' }, 
				 *				col_keys:	[   { key:'s_shares', 	calc:'{SUM}' }, 
				 *								{ key:'s_cbasis', 	calc:'{MAX}' },
				 *								{ key:'s_mvalue', 	calc:'{MIN}' }, 
				 *								{ key:'gl', 		func: pos_gl_calc, 		formatter:"number" },
				 *								{ key:'glperc', 	func: pos_glperc_calc, 	formatter:"number" },
				 *								{ key:'edit',		exclude:true } 
				 *							]
				 *			}
                 *
                 * @type {String or Function} 
                 * @default null
                **/
				this.setAttributeConfig( "tfooter", {
				        value: {
							fixed:		true,
							heading:	null, //{colspan:null, label:"", className:null },
							col_keys:	null //  []
						},
				        validator: Lang.isObject,
						method: function(oParam) {
							this._tfooter_config = oParam;
						}
						
			    });
            },



			/**
			 * Creates the footer TR row element , and the TH and TD element containers
			 * and applies the required styles, classes, etc..
			 * 
			 * It also populates the footer with active data from the RecordSet 
			 * 	
             * @method renderFooter
             * @public
             * 
             * @called_by refreshEvent
			 */
			renderFooter :	function() {

				YAHOO.log("Beginning renderFooter","info");
				
				if ( this._tfooter_config ) {

					var RS = this.getRecordSet(), 
						CS = this.getColumnSet(),
						elContainer = this._elContainer,
						elFootContainer = this._elFootContainer, //null,
						elFootTable = this._elFootTable, //null,
						elFootEl = this._elFootEl, //null, 
						elFootRow = this._elFootRow, //null,
						tf_config = this._tfooter_config; 
					
					var firstRec = this.getRecordSet().getRecord(0);
					var elTableFirstTr = this.getFirstTrEl();

				//
				//  Remove prior children ...
				//
					var elTr = this._elFootRow; //,
					while ( elTr.hasChildNodes() )
						elTr.removeChild( elTr.lastChild );
	
				//
				// === Create the TH (heading) for the Footer 
				//       account for 'colspan' if defined and insert the 'label' into TH
				//
					var col_start = ( tf_config.heading && tf_config.heading.colspan ) ? tf_config.heading.colspan :  0;
	
					this._createFootTH( elTr );
					this._updateFootTH( tf_config.heading );
								
					var elTable = ( tf_config.fixed === true ) ? this._elFootTable : this._elTable;
	
					var colopts = this._Foot_colopts
				//
				//  Loop through user-defined oConfigs fields to be summarized
				//    where,
				//        colopts {Array of Objects} = one per ColumnSet column
				//
					if ( tf_config.col_keys && Lang.isArray( tf_config.col_keys ) ) {
						this._recalcFooter();
						this._createFootTDs( col_start, elTr );
						this._updateFootTDs( col_start );
					}
	
				//
				//  Append the TFOOT to the table ...
				//
					this._elFootEl = elFootEl;
					this._elFootRow = elTr;
					elFootEl.appendChild( elTr );
					elTable.appendChild( elFootEl )
					
					this.validateColumnWidths();
					//this._syncColWidths();
					
					this.fireEvent( "renderFooterEvent", { elFoot:this.elFootEl, colOpts:colopts} );
					
				}
				YAHOO.log("Ending renderFooter","info");

				return;
			},


			/**
			 * Refreshes the existing TFOOT DOM elements, including the TH and TD fields 
			 * using the existing RecordSet. 
			 * 	
             * @method refreshFooter
             * @param none 
             * @configs {Object} tfooter
             *    
             * @called_by refreshEvent (see _initEvents this module)
			 */
			refreshFooter :  function() {

				YAHOO.log("Beginning refreshFooter","info");

				if ( this._tfooter_config ) {

					var RS = this._oRecordSet, 
						CS = this._oColumnSet,
						tf_config = this._tfooter_config; 

					var firstRec = this.getRecordSet().getRecord(0);
					var elTableFirstTr = this.getFirstTrEl();
					
					var elTr = this._elFootRow; 

					var col_start = ( tf_config.heading && tf_config.heading.colspan ) ? tf_config.heading.colspan :  0;
	
					this._updateFootTH( tf_config.heading );
								
					if ( tf_config.col_keys && Lang.isArray( tf_config.col_keys ) ) {
						this._recalcFooter();
						this._updateFootTDs( col_start );
					}
					
					this.fireEvent( "refreshFooterEvent", { elFoot:this.elFootEl, colOpts:colopts } );
					
				}

				YAHOO.log("Ending refreshFooter","info");
				
			},

			

			/**
			 * This is an override for DataTable's own <code>setColumnWidth</code>
			 * to allow updating of the TFOOT cells after the DataTable column sizes are changed.
			 *
			 * @method setColumnWidth
			 * @param oColumn {YAHOO.widget.Column} Column requiring a change
			 * @param nWidth  {Number} New width of column
			 */
			setColumnWidth :	function(oColumn, nWidth) {
				DTSF.superclass.setColumnWidth.call(this, oColumn, nWidth);
				if ( this._tfooter_config ) this._updateFooterColumn( oColumn );
			},


		/** =================================================== */
		/**                 HELPER METHODS                      */
		/** =================================================== */

			/**
			 * Returns the Tfoot element (specifically <TFOOT>), if it exists
             * @method getFootEl()
             * @param none 
			 */
			getFootEl :	function() {
				return this._elFootEl;
			},


			/**
			 * Returns the TFOOT <TH> element, if it exists
             * @method getFootTH()
             * @param none 
			 */
			getFootTH :	function() {
				return this._elFootTH;
			},

			/**
			 * Returns the TFOOT TH element Liner DIV element, if it exists
             * @method getFootTHLinerEl()
             * @param none 
			 */
			getFootTHLinerEl :	function() {
				return this._elFootTHLinerEl;
			},


			/**
			 * Returns the TFOOT TR element, if it exists
             * @method getFootRow()
             * @param none 
			 */
			getFootRow :  function() {
				return this._elFootRow;
			},


			/**
			 * Returns the TFOOT TD element for the specified TD index, if it exists
             * @method getFootTd()
             * @param none 
			 */
			getFootTd : function( index ) {
				var elFootRow = this.getFootRow();
				
				var tds = Dom.getChildrenBy( elFootRow, function(node){
					if ( node.tagName.toLowerCase() === 'td' ) return true;
					else return false;
				});
				
				return tds[index] || null;
			},


			/**
			 * Returns the TFOOT TD element Liner DIV for the specified TD index, if it exists
             * @method getFootTdLinerEl()
             * @param none 
			 */
			getFootTdLinerEl : function(index) {
				var td = this.getFootTd(index);
				if ( td ) return Dom.getFirstChild(td);
			},


			/**
			 * Overrides DataTable's destroy method to also destroy the FOOTER DIV and Table
			 * @method destroy
			 */
			destroy: function() {
				this._destroyFooter();
				DTSF.superclass.destroy.apply(this, arguments);
			}



	/////////////////////////////////////////////////////////////////////////////
	//
	// Custom Events
	//
	/////////////////////////////////////////////////////////////////////////////

		/**
		 * Fired when the footer is rendered, after "refreshEvent" executes
		 *
		 * @event renderFooterEvent
		 * @param oArgs.elFoot {HTML Element} The <TFOOT> element
		 * @param oArgs.colOpts {Object} 	  The footer column options element
		 * @caller renderFooter
		 */

		/**
		 * Fired when the footer is rendered, after "refreshEvent" executes
		 *
		 * @event refreshFooterEvent
		 * @param oArgs.elFoot {HTML Element} The <TFOOT> element
		 * @param oArgs.colOpts {Object} 	  The footer column options element
		 * @caller refreshFooter
		 */

		}
	);
		
})();	
