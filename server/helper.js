if (typeof Array.prototype.addColumn == 'undefined') {
    Array.prototype.addColumn = function(id, arr) {
        for (var i = 0; i < this.length; i++) {
            this[i][id] = arr[i];
        }
        return this;
    }
}

if (typeof Array.prototype.addObj == 'undefined') {
    Array.prototype.addObj = function(obj) {
        this.push(obj);
        return this;
    }
}

if (typeof Array.prototype.removeObj == 'undefined') {
    Array.prototype.removeObj = function(id) {
        for (var i = 0; i < this.length; i++) {
            if (this[i].id === id) {
                this.splice(i, 1);
                i--;
            }
        }
        return this;
    }
}

if (typeof Array.prototype.updateObj == 'undefined') {
    Array.prototype.updateObj = function(id, obj) {
        for (var i = 0; i < this.length; i++) {
            if (this[i].id === id) {
                this[i] = obj;
            }
        }
        return this;
    }
}

if (typeof Array.prototype.existsObj == 'undefined') {
    Array.prototype.existsObj = function(id) {
        var res = false;
        for (var i = 0; i < this.length; i++) {
            if (this[i].id === id) {
                res = true;
                break;
            }
        }
        return res;
    }
}

if (typeof Array.prototype.retrieveObj == 'undefined') {
    Array.prototype.retrieveObj = function(id) {
        var obj = null;
        for (var i = 0; i < this.length; i++) {
            if (this[i].id === id) {
                obj = this[i];
            }
        }
        return obj;
    }
}

if (typeof Array.prototype.retrieveObjIdRef == 'undefined') {
    Array.prototype.retrieveObjIdRef = function(id) {
        var obj = null;
        for (var i = 0; i < this.length; i++) {
            if (this[i].idref === id) {
                obj = this[i];
            }
        }
        return obj;
    }
}

if (typeof Array.prototype.clear == 'undefined') {
    Array.prototype.clear = function() {
        while (this.length > 0) {
            this.pop();
        }
    }
}

if (typeof (Object.prototype.merge) === "undefined") {
    Object.prototype.merge = function(obj) {
        for (var attrname in obj) {
            this[attrname] = obj[attrname];
        }
    }
}

if (typeof (Object.prototype.diffObj) === "undefined") {
    Object.prototype.diffObj = function(obj) {
        var res = false;
        for (var attrname in obj) {
            if (this.hasOwnProperty(attrname)) {
                if (this[attrname] != obj[attrname]) {
                    if (res == false) {
                        res = true;
                        break;
                    }
                }
            }
        }
        return res;
    }
}

if (typeof (Object.prototype.isEmpty) === "undefined") {
    Object.prototype.isEmpty = function() {
        for (var key in this) {
            if (this.hasOwnProperty(key)) {
                return false;
            }
        }
        return true;
    }
}

if (typeof String.prototype.padding == 'undefined') {
    String.prototype.padding = function(padString, length) {
        var str = this;
        while (str.length < length)
            str = str + padString;
        return str;
    }
}

if (typeof Object.prototype.round == 'undefined') {
    Object.prototype.round = function(dec) {
        return Math.round(this * Math.pow(10, dec)) / Math.pow(10, dec);
    }
}

if (typeof Object.prototype.uniqueId == 'undefined') {
    Object.prototype.uniqueId = function() {
        var d = new Date().getTime();
        var uuid = 'ID_xxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
        });
        return uuid;
    }
}

if (typeof Object.prototype.ringshiftright == 'undefined') {
    Object.prototype.ringshiftright = function(count) {
        for (i = 0; i <= count; i++) {          // --> last to first
          var shifttemp = this[this.length-1];  // Save 3
          for(index = this.length-1; index < 0; index--) { 
            this[index] =  this[index-1];       // 3 = 2 , 2 = 1, 1 = 0
          }
          this[0] = shifttemp;                  // 0 = 3
        }
        return this;
    }
}

if (typeof Object.prototype.ringshiftleft == 'undefined') {
    Object.prototype.ringshiftleft = function(count) {
        for (i = 0; i <= count; i++) {          // <-- first to last   
          var shifttemp = this[0];              // Save 0
          for(index = 0 ; index < this.length-1; index++) { 
            this[index] =  this[index+1];       // 0 = 1 , 1 = 2, 2 = 3
          }
          this[this.length-1] = shifttemp;      // 3 = 0
        }
        return this;
    }
}

if (typeof Object.prototype.countkey == 'undefined') {
  Object.prototype.countkey = function(id) {
    var cnt = 0;
    for (var key in this) {
      var obj = this[key];
      for (var prop in obj) {
        if(obj.hasOwnProperty(prop)){
          if(obj['showid'] == id){
            cnt++; 
          }
        }
      }
    }
    return cnt;
  }
}