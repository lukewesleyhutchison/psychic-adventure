

const dotenv = require('dotenv').config();
const express = require('express');
const app = express();

const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');
const request = require('request-promise');
const shopifyAPI = require('shopify-node-api');

//get keys from API file
const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const cID = process.env.GOOGLE_CLIENT_ID;
const gSecret = process.env.GOOGLE_API_SECRET;

//what the app accesses
const scopes = 'read_customers, read_orders';

//the url
const forwardingAddress = "https://aa503487.ngrok.io"; // Replace this with your HTTPS Forwarding address
var token = "";
  
app.get('/', (req, res) => {
  //TODO: get access token from cookie
  //pass access token through shop data
  console.log('DATE 0: ' + req.param('date'));
  console.log('DATE 1: ' + req.param('date1'));
  console.log("shopify data query");
  console.log(token);
  console.log(req.param('date'));
  console.log(req.param('date1'));
  var date = req.param('date');
  var date1 = req.param('date1');
  
  function x_days_Ago(X){
      var date = new Date(Date.now() + -1*X*24*3600*1000);
      var dd = date.getDate();
      var mm = date.getMonth()+1;
      var yyyy = date.getFullYear();
      
      if (dd < 10) {
          dd = '0' + dd;
      }
      if (mm < 10) {
          mm = '0' + mm;
      }
      date = yyyy + '-' + mm + '-' + dd ;
      return date;
  }
  
  //if no max date selected, set to current date
  if (date == ''){
      date = x_days_ago(0);
      console.log('current date: ' + date);
  } 
  
  //if no min date selected, set to 30 days ago
  if (date1 ==''){
      date1 = x_days_Ago(30);
      console.log('30 days ago: ' + date1);
  }
  
  shop_data();
  function shop_data() {
    var order_url = 'https://test948913570914.myshopify.com/admin/orders.json';
    const shopRequestHeaders = {
            'X-Shopify-Access-Token': token
    };

    order_url = order_url + '?created_at_max=' + date + 't00:00:00-00:00&created_at_min=' + date1 + 't00:00:00-00:00';
    console.log(order_url);
    request.get(order_url, { headers: shopRequestHeaders })
        .then((shopResponse) => {
            console.log("shop data status: " + res.statusCode); //status code(200 successful)
            if (res.statusCode == 200 || res.statusCode == 304) {
                console.log("callback status: " + res.statusCode); //status code(200 successful)
            var data = JSON.parse(shopResponse); //raw data
            var order_id = []; //list of customer ids and order dates
            var order_dupes = []; //list of returning customer ids and order dates
            
            var customers = []; //list of customers that ordered
            var new_customers = []; //list of new customers
            var returning_customers = []; //list of returning customers
            
            var orders_count = []; //number of orders per customer
            var total_orders = 0.0; //total spent on orders across all customers
            var no_orders = parseInt(data.orders.length); //total orders
            
            //var timespan = (datetime1.getTime() - datetime.getTime()); //length of timeframe given in milliseconds
            var TBP = 0; //time between purchases
            var seen = {}; 
            var j = 0; //customer counter
            
            //create list of customers, create list of repeat customer orders.
            //calculate revenue
            for (i = 0; i < no_orders; i++) { 
                total_orders += parseFloat(data.orders[i].total_price);
                order_id.push([data.orders[i].customer.id, data.orders[i].created_at]);
                var item = order_id[i][0];
                if (seen[item] !== 1){
                    seen[item] = 1;
                    customers[j++] = item;
                    orders_count.push(data.orders[i].customer.orders_count);
                }
                if (data.orders[i].customer.orders_count !== 1){
                    order_dupes.push([data.orders[i].customer.id, data.orders[i].created_at]);
                }  
            }   
           
            //check if customer has ordered before
            //create list of returning and new customers
            for (i = 0; i < customers.length; i++) {
                if (orders_count[i] > 1) {
                    returning_customers.push(customers[i]);
                    
                }
                if (orders_count[i] === 1) {
                    new_customers.push(customers[i]);
                }
            }
            
            //order_dupes.push([369318002732, 'rabble dabble']);
            //order_dupes.push([369318002732, '2018-02-03T17:36:58-05:00']);
            //order_dupes.push([369317740588, 'dabble rabble']);
            
            //create orders list for repeat customers. sort by time placed. 
            var sort_arr = [];
            var RCO = [];
            var len = order_dupes.length;
            order_dupes.sort();
            for (i = 1; i < len ; i++){
                sort_arr.push(order_dupes[i-1][1]);
                if (order_dupes[i][0] !== order_dupes[i-1][0]){
                    sort_arr.sort();
                    RCO.push(sort_arr);
                    sort_arr = [];
                }
            }
            sort_arr.push(order_dupes[len-1][1]);
            sort_arr.sort();
            RCO.push(sort_arr);
            
            //get time between first and second purchase
            for (i=0; i < RCO.length; i++) {
                var date_time = RCO[i][0].split('T'); //first purchase date
                var date_time1 = RCO[i][1].split('T'); //second purchase date
                //date_time[0].split('-');
                date_time1[0].split('-');
                var date_time = new Date(date_time[0].split('-'));
                var date_time1 = new Date(date_time1[0].split('-'));
                TBP += date_time.getTime() - date_time1.getTime();
            }
            
            //console.log(data);
            //console.log('returning c data: ' + order_dupes);
            //console.log('c data: ' + order_id);
            //console.log(customers);
            //console.log(returning_customers);
            //console.log(new_customers);
            //console.log('order count: ' + orders_count);
            //console.log(RCO);
            //console.log(accessToken)
            //console.log('timespan: ' + timespan);
            //console.log('customers: ' + customers.length);
            //console.log('repeat customers: ' + returning_customers.length);
            //console.log('new customers: ' + new_customers.length);
            console.log('number of orders: ' + no_orders);
            
            console.log("shop query complete");
            
            //metrics
            console.log('REV: ' + total_orders); //Revenue
            console.log('AOV: ' + total_orders / no_orders); //Average Order Value
            console.log('CLTV: ' + total_orders / customers.length); //Customer Lifetime Value
            console.log('RPR: ' + returning_customers.length / customers.length); //Repeat Purchase Rate
            //console.log('TBP: ' + TBP / RCO.length); //time between purchase
            
            //create cookies to pass data across pages
            res.cookie('RPR: ', returning_customers.length / customers.length);
            res.cookie('TBP: ', TBP / RCO.length);
            res.cookie('CLTV: ', total_orders / customers.length);
            res.cookie('AOV: ', total_orders / no_orders);
            res.cookie('REV: ', total_orders);
            
            //res.cookie("AOV:", 12);
            res.sendfile('index.html');
            }
            else {
                return 0;
            }
    });
  };
});

app.listen(3000, () => {
  console.log('App listening on port 3000!');
});

//install
app.get('/shopify', (req, res) => {
    console.log("shopify");
  const shop = req.query.shop;
  if (shop) {
    const state = nonce();
    const redirectUri = forwardingAddress + '/shopify/callback';
    const installUrl = 'https://' + shop +
      '/admin/oauth/authorize?client_id=' + apiKey +
      '&scope=' + scopes +
      '&state=' + state +
      '&redirect_uri=' + redirectUri;
    res.cookie('state', state);
    res.redirect(installUrl);
  } 
  else {
    return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
  }
});

//callback
app.get('/shopify/callback', (req, res) => {
    console.log("callback");
    const { shop, hmac, code, state } = req.query;
    const stateCookie = cookie.parse(req.headers.cookie).state;
    if (state !== stateCookie) {
        return res.status(403).send('Request origin cannot be verified');
    }

  //Validate request is from Shopify
    if (shop && hmac && code) {
        const map = Object.assign({}, req.query);
        delete map['signature'];
        delete map['hmac'];
        const message = querystring.stringify(map);
        const generatedHash = crypto
        .createHmac('sha256', apiSecret)
        .update(message)
        .digest('hex');
        if (generatedHash !== hmac) {
            return res.status(400).send('HMAC validation failed');
        }

    //Exchange temporary code for a permanent access token
    const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token';
    const accessTokenPayload = {
        client_id: apiKey,
        client_secret: apiSecret,
        code
    };
    request.post(accessTokenRequestUrl, { json: accessTokenPayload })
    .then((accessTokenResponse) => {
        const accessToken = accessTokenResponse.access_token;
        const shopRequestUrl = 'https://' + shop + '/admin/shop.json';
        const shopRequestHeaders = {
            'X-Shopify-Access-Token': accessToken
        };
        res.sendfile('index.html');
        token = accessToken;
        /*
        token = accessToken;
        //use access token
        const date = '2018-02-08';
        const time = '23:59:59';
        const date1 = '2018-02-01';
        const time1 = '23:59:59';
        const date_url = 'created_at_max=' + date + 't' + time + '&' + 'create_at_min=' + date1 + 't' + time1;
        const f_status = 'financial_status=any';
        //const date_url = 'created_at_max=2018-02-08t23:59:59&created_at_min=2018-02-01t23:59:59';
        const order_url = 'https://' + shop + '/admin/orders.json?' + f_status + '&' + date_url;
        request.get(order_url, { headers: shopRequestHeaders })
        .then((shopResponse) => {
            console.log("callback status: " + res.statusCode); //status code(200 successful)
            var data = JSON.parse(shopResponse); //raw data
            var order_id = []; //list of customer ids and order dates
            var order_dupes = []; //list of returning customer ids and order dates
            
            var customers = []; //list of customers that ordered
            var new_customers = []; //list of new customers
            var returning_customers = []; //list of returning customers
            
            var orders_count = []; //number of orders per customer
            var total_orders = 0.0; //total spent on orders across all customers
            var no_orders = parseInt(data.orders.length); //total orders
            
            //var timespan = (datetime1.getTime() - datetime.getTime()); //length of timeframe given in milliseconds
            var TBP = 0; //time between purchases
            var seen = {}; 
            var j = 0; //customer counter
            
            //create list of customers, create list of repeat customer orders.
            //calculate revenue
            for (i = 0; i < no_orders; i++) { 
                total_orders += parseFloat(data.orders[i].total_price);
                order_id.push([data.orders[i].customer.id, data.orders[i].created_at]);
                var item = order_id[i][0];
                if (seen[item] !== 1){
                    seen[item] = 1;
                    customers[j++] = item;
                    orders_count.push(data.orders[i].customer.orders_count);
                }
                if (data.orders[i].customer.orders_count !== 1){
                    order_dupes.push([data.orders[i].customer.id, data.orders[i].created_at]);
                }  
            }   
           
            //check if customer has ordered before
            //create list of returning and new customers
            for (i = 0; i < customers.length; i++) {
                if (orders_count[i] > 1) {
                    returning_customers.push(customers[i]);
                    
                }
                if (orders_count[i] === 1) {
                    new_customers.push(customers[i]);
                }
            }
            
            //order_dupes.push([369318002732, 'rabble dabble']);
            //order_dupes.push([369318002732, '2018-02-03T17:36:58-05:00']);
            //order_dupes.push([369317740588, 'dabble rabble']);
            
            //create orders list for repeat customers. sort by time placed. 
            var sort_arr = [];
            var RCO = [];
            var len = order_dupes.length;
            order_dupes.sort();
            for (i = 1; i < len ; i++){
                sort_arr.push(order_dupes[i-1][1]);
                if (order_dupes[i][0] !== order_dupes[i-1][0]){
                    sort_arr.sort();
                    RCO.push(sort_arr);
                    sort_arr = [];
                }
            }
            sort_arr.push(order_dupes[len-1][1]);
            sort_arr.sort();
            RCO.push(sort_arr);
            
            //get time between first and second purchase
            for (i=0; i < RCO.length; i++) {
                var date_time = RCO[i][0].split('T'); //first purchase date
                var date_time1 = RCO[i][1].split('T'); //second purchase date
                //date_time[0].split('-');
                date_time1[0].split('-');
                var date_time = new Date(date_time[0].split('-'));
                var date_time1 = new Date(date_time1[0].split('-'));
                TBP += date_time.getTime() - date_time1.getTime();
            }
            
            //console.log(data);
            //console.log('returning c data: ' + order_dupes);
            //console.log('c data: ' + order_id);
            //console.log(customers);
            //console.log(returning_customers);
            //console.log(new_customers);
            //console.log('order count: ' + orders_count);
            //console.log(RCO);
            //console.log(accessToken)
            //console.log('timespan: ' + timespan);
            //console.log('customers: ' + customers.length);
            //console.log('repeat customers: ' + returning_customers.length);
            //console.log('new customers: ' + new_customers.length);
            //console.log('number of orders: ' + no_orders);
            
            //metrics
            //console.log('REV: ' + total_orders); //Revenue
            //console.log('AOV: ' + total_orders / no_orders); //Average Order Value
            //console.log('CLTV: ' + total_orders / customers.length); //Customer Lifetime Value
            //console.log('RPR: ' + returning_customers.length / customers.length); //Repeat Purchase Rate
            //console.log('TBP: ' + TBP / RCO.length); //naive Time Between Purchase
            
            //create cookies to pass data across pages
            res.cookie('RPR: ', returning_customers.length / customers.length);
            res.cookie('TBP: ', TBP / RCO.length);
            res.cookie('CLTV: ', total_orders / customers.length);
            res.cookie('AOV: ', total_orders / no_orders);
            res.cookie('REV: ', total_orders);
            res.cookie('AccessToken: ', accessToken);
            res.cookie('shop: ', shop);
            
            res.sendfile("index.html");
        })
        .catch((error) => {
        res.status(error.statusCode).send(error.error.error_description); 
        }); */
    }) 
    .catch((error) => {
        res.status(error.statusCode).send(error.error.error_description);
    });
    
    } else {
        res.status(400).send('Required parameters missing');
    }
});

app.get('index.html', function(req, res) {
    res.sendfile("index.html");
});

app.get('index.html', function(req,res) {
    console.log('js func');
    res.send('data: ' + req.query['date']);
});
