L.WFST = L.GeoJSON.extend({

    // These functions overload the parent (GeoJSON) functions with some WFS-T
    // operations and then call the parent functions to do the Leaflet stuff

    initialize: function(geojson,options){
        // These come from OL demo: http://openlayers.org/dev/examples/wfs-protocol-transactions.js
        var initOptions = L.extend({
            showExisting: true,         // Show existing features in WFST layer on map?
            version: "1.1.0",           // WFS version 
            failure: function(msg){}    // Function for handling initialization failures
            // geomField : <field_name> // The geometry field to use. Auto-detected if only one geom field 
            // url: <WFS service URL> 
            // featureNS: Feature NameSpace
            // featureType: Feature Type 
        },options);


        if(typeof initOptions.url == 'undefined'){ throw "ERROR: No WFST url declared"; }
        if(typeof initOptions.featureNS == 'undefined'){ throw "ERROR: featureNS not declared"; }
        if(typeof initOptions.featureType == 'undefined'){ throw "ERROR: featureType not declared"; }

        // Call to parent initialize
        L.GeoJSON.prototype.initialize.call(this,geojson,initOptions);

        // Now probably an ajax call to get existing features
        if(this.options.showExisting){
            this._loadExistingFeatures();
        }
        this._loadFeatureDescription();
    },
    // Additional functionality for these functions
    addLayer: function(layer) {
        console.log("Do wfst add");
        this.wfstAdd(layer);
        // Call to parent addLayer
        L.GeoJSON.prototype.addLayer.call(this,layer);
    },
    removeLayer: function(layer) {
        console.log("Do wfst remove");
        this.wfstRemove(layer);

        // Call to parent removeLayer
        L.GeoJSON.prototype.removeLayer.call(this,layer);
    },


    // These functions are unique to WFST

    // WFST Public functions

    /* 
    Save changes to one or more layers which we may or may not already have
    layer : a single layer or array of layers. Possibly an empty array
    */
    wfstAdd: function(layers,options){
        console.log("Save layers now!");
        options = options || {};
        layers = layers ? (L.Util.isArray(layers) ? layers : [layers]) : [];

        for (var i = 0, len = layers.length; i < len; i++) {
            this._wfstAdd(layers[i],options);
        }
    },
    wfstRemove: function(layers,options){
        console.log("Save layers now!");
        options = options || {};
        layers = layers ? (L.Util.isArray(layers) ? layers : [layers]) : [];

        for (var i = 0, len = layers.length; i < len; i++) {
            this._wfstRemove(layers[i],options);
        }
    },
    wfstSave: function(layers){
        console.log("Save layers now!");
        options = options || {};
        layers = layers ? (L.Util.isArray(layers) ? layers : [layers]) : [];

        for (var i = 0, len = layers.length; i < len; i++) {
            this._wfstSave(layers[i],options);
        }
    },
    wfstTouch: function(layers){
        // Touch a file so it needs to be saved again
        layers = layers ? (L.Util.isArray(layers) ? layers : [layers]) : [];
        console.log("Save layers now!");

        for (var i = 0, len = layers.length; i < len; i++) {
            layers[i].properties._wfstSaved = false;
        }
    },
    wfstSaveDirty: function(){
        for (var i = 0, len = layers.length; i < len; i++) {
            if(layers[i].properties._wfstSaved === false){
                this.wfstSave(layers[i]);
            }
        }
    },


    // WFST Private functions

    // Interesting / real functions
    // Add a single layer with WFS-T
    _wfstAdd: function(layer,options){
        console.log("Adding");

        options = options || {};

        var xml = this.options._xmlpre;

        xml += "<wfs:Insert>";
        xml += "<" + this.typename + ">";
        xml += this._wfstSetValues(layer);
        xml += "</" + this.typename + ">";
        xml += "</wfs:Insert>";
        xml += "</wfs:Transaction>";

        this._ajax( L.extend({method:'POST', data:xml},options));
    },
    // Remove a single layers with WFS-T
    _wfstRemove: function(layer,options){
        console.log("Removing");

        options = options || {};
        console.log(layer.toGML());
    },
    //  Save changes to a single layer with WFS-T
    _wfstSave: function(layer){
        console.log("Saving");

        options = options || {};
        console.log(layer.toGML());
    },


    // Utility functions

    // Build the xml for setting/updating fields
    _wfstSetValues: function(layer){
        var xml = '';
        var elems = this._fieldsByAttribute();

        var geomFields = [];

        for(var p = 0;p < elems.length;p++){
            attr = elems[p].getAttribute('name');

            if( typeof layer.feature != 'undefined' && 
                typeof layer.feature.properties != 'undefined' && typeof 
                layer.feature.properties[attr] != 'undefined'
            ){
                xml += "<" + this.workspace + ":" + attr +">";
                xml += layer.feature.properties[attr];
                xml += "</" + this.workspace + ":" + attr +">";
            }else if(elems[p].getAttribute('type') == 'gml:GeometryPropertyType'){
                geomFields.push(elems[p]);
            }else if(elems[p].getAttribute('nillable') == 'false'){
                if(elems[p].getAttribute('maxOccurs') != "1" && elems[p].getAttribute('minOccurs') != "1"){
                    console.log("No value given for required field " + attr);
                    return false; // No value given for required field!
                }
            }
        }

        if(this.options.geomField || geomFields.length === 1){
            this.options.geomFields = this.options.geomField || geomFields[0];

            xml += "<" + this.workspace + ":" + attr +">";
            xml += layer.toGML();
            xml += "</" + this.workspace + ":" + attr +">";
        }else{
            console.log("No geometry field!");
            return false;
        }
        return xml;
    },

    /* Make an ajax request
    options: {
    url: url to fetch (required),
    method : GET, POST (optional, default is GET),
    success : function (optional), must accept a string if present
    failure: function (optional), must accept a string if present
    }
    */
    _ajax: function(options){
        options = L.extend({
            method: 'GET',
            success: function(r){},
            failure: function(r){},
            self: this,
            url: this.options.url
        },options);

        var xmlhttpreq = (window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP'));
        xmlhttpreq.onreadystatechange=function() {
            if(xmlhttpreq.readyState==4){
                if(xmlhttpreq.status==200){
                    options.success(xmlhttpreq.responseText);
                }else{
                    options.failure(xmlhttpreq.responseText);
                }
            }
        };
        xmlhttpreq.open(options.method,options.url,true);
        xmlhttpreq.send(options.data);
    },
    /*
    Get all existing objects from the WFS service and draw them
    */
    _loadExistingFeatures: function(){
        var geoJsonUrl = this.options.url + '?service=WFS&version=1.0.0&request=GetFeature&typeName=' + this.options.featureNS + ':' + this.options.featureType + '&outputFormat=json';
        this._ajax({
            url: geoJsonUrl,
            success: function(res){
                res = JSON.parse(res);
                for(var i = 0,len = res.features.length;i<len;i++){
                    res.features[i]._wfstSaved = true;
                }
                this.self.addData(res.features);
            }
        });
    },
    /*
    Get the feature description
    */
    _loadFeatureDescription: function(){
        var describeFeatureUrl = this.options.url + '?request=DescribeFeatureType&typename=' + this.options.featureNS + ':' + this.options.featureType;
        this._ajax({
            url: describeFeatureUrl,
            success: function(res){
                xml = this.self._parseXml(res);
                var exception = this.self._getElementsByTagName(xml,'ows:ExceptionReport');
                if(exception.length === 0){
                    this.self.options.featureinfo = xml;
                    this.self._xmlPreamble();
                    this.self.ready = true;
                }else{
                    this.self.failure("There was an exception fetching DescribeFeatueType");
                }
            }
        });
    },







    // Deal with XML -- should probably put this into gml and do reading and writing there
    _parseXml: function(rawxml){
        if (window.DOMParser)
        {
            parser=new DOMParser();
            xmlDoc=parser.parseFromString(rawxml,"text/xml");
        }
        else // Internet Explorer
        {
            xmlDoc=new ActiveXObject("Microsoft.XMLDOM");
            xmlDoc.async=false;
            xmlDoc.loadXML(rawxml);
        } 

        return xmlDoc;
    },
    _xmlPreamble: function(){
        var target = this._getElementsByTagName(this.options.featureinfo,'xsd:schema')[0].getAttribute('targetNamespace');

        var _xmlpre = '';
        _xmlpre = '';
        _xmlpre += '<wfs:Transaction service="WFS" version="1.1.0"'; 
        _xmlpre += ' xmlns:wfs="http://www.opengis.net/wfs"';
        _xmlpre += ' xmlns:gml="http://www.opengis.net/gml"';
        _xmlpre += ' xmlns:' + this.workspace + '="' + target + '"';
        _xmlpre += ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"';
        _xmlpre += ' xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.0.0/WFS-transaction.xsd';
        _xmlpre += ' ' + this.url + '?request=DescribeFeatureType&amp;typename=' + this.options.featureNS;
        _xmlpre += '">';

        this.options._xmlpre = _xmlpre;
    },

    // A compatibility layer because browsers argue about the right way to do getElementsByTagName when namespaces are involved
    _getElementsByTagName : function(xml,name){
        var tag = xml.getElementsByTagName(name);
        if(!tag || tag === null || tag.length === 0){
            tag = xml.getElementsByTagName(name.replace(/.*:/,''));
        }
        if(!tag || tag === null || tag.length === 0){
            tag = xml.getElementsByTagNameNS('', name.replace(/.*:/,''));
        }
        return tag;
    },

    _fieldsByAttribute: function(attribute,value,max){
        var seq = this._getElementsByTagName(this.options.featureinfo,'xsd:sequence')[0];
        if(typeof seq == 'undefined'){
            return [];
        }
        var elems = this._getElementsByTagName(seq,'xsd:element');
        var found = [];

        var foundVal;
        for(var e = 0;e < elems.length;e++){
            if(typeof attribute == 'undefined'){
                found.push(elems[e]);
            }else if(elems[e].getAttribute(attribute) == value){
                found.push(elems[e]);
                if(typeof max == 'number' && found.length == max){
                    return found;
                }
            }
        }

        return found;
    }

    // Todo: create/handle onchange?

});

L.wfst = function(geojson,options){
    return new L.WFST(geojson,options);
};
