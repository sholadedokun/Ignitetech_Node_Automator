var express = require('express');
var router = express.Router();
var _ = require('lodash')
var mongoose=require('mongoose');
var adminSchema=require('../app/models/appSchema.js');
var moment= require ('moment');
// var multer=require('multer');

/* GET users listing. */

router.get('/serverDate', function(req, res, next) {
    res.json({date:Date.now()});
})
router.get('/inventory', function(req, res, next) {
    adminSchema.inventory.find()
    .populate('biddingSettings')
    .sort({dateCreated:-1})
    .exec (function(err, inventory)
    {
        if(err) return res.send(err);
        res.json(inventory)
    })

});
router.get('/category', function(req, res, next){
    adminSchema.category.find()
    .populate('subCategories')
    .exec(function(err, category)
    {
        if(err) return res.send(err);
        res.json(category)
    })
});
router.get('/types', function(req, res, next) {
    adminSchema.type.find()
    .exec(function(err, types){
        if(err) return res.send(err);
        res.json(types)
    })
});

//get a particular post
router.get('/:id', function(req, res, next){
    adminSchema.inventory.findById(req.params.id)
    .populate(
        {
            path:'biddingHistory',
            populate:{path: 'userId'}
        })
    .populate(
        {
            path:'subCategory',
            populate:{path: 'category'}
        })
    .populate('biddingSettings inventoryTags')
    .exec(function(err, inventory){
        if(err)return res.send(err)
        res.json(inventory);
    })
});
router.get('/category/:id', function(req, res, next) {
    adminSchema.category.findById(req.params.id, function(err, category){
        if(err) return res.send(err);
        res.json(category)
    })
});
router.get('/subcategory/:id', function(req, res, next) {
    adminSchema.subcategory.find({category:req.params.id})
    .populate('category')
    .exec (function(err, subcategory){
        if(err) return res.send(err);
        res.json(subcategory)
    })
});
router.get('/userProfile/:id', function(req, res, next) {
    adminSchema.user.findById(req.params.id)
    .populate({
        path:'userBids',
        populate:{path: 'biddingSettings biddingHistory'}
    })
    .exec(function(err, user){
        if(err) return res.send(err);
        res.json(user)
    })
});
router.get('/userLogin/:id', function(req, res, next) {
    console.log(req.query)
    adminSchema.user.find({password:req.query.password, $or:[{email:req.query.identity}, {userName:req.query.identity}]})
    //.populate('userBids')
    .exec (function(err, user){
        if(err) return res.send(err);
        res.json(user)
    })
});

//send a post
// router.post('/multer', upload.single('file'));
router.post('/inventory', function(req, res, next){
    adminSchema.inventory.create(req.body, function(err, post){
        if(err) return res.send(err)
        res.json(post)
    })
});
router.post('/category', function(req, res, next){
    adminSchema.category.create(req.body, function(err, post){
        if(err) return res.send(err)
        res.json(post);
    })
});
router.post('/changeAllOrderStatus', function(req, res, next){
    const {coverageType, status, orders}=req.body
    switch(coverageType){
        case "allOrders":
            let currentDate = moment().startOf('day').add(13, 'hours').toDate();
            let errorOrders =[];
            adminSchema.orders.find({deliveryDate:currentDate})
            .exec(function(err, orders){
                if(err) return console.log(err)
                else{
                    _.map(orders, (item,index)=>{
                        adminSchema.orders.findByIdAndUpdate(item._id, {status}, function(err, order){
                            if(err){
                                errorOrders.push(item)
                            }
                            if(index == order.length -1){
                                res.json({
                                    message:'Auto Order is completed'
                                })
                            }
                        })
                    })
                    res.json(errorOrders)
                }
            })
    }
})
router.post('/orders', function(req, res, next){
    // select all active subscription from the database
    adminSchema.subscribedPlan.find({status:'active'}).populate('planId userId')
    .exec(function(err, subScription)
    {
        if(err) return console.log(err)
        // iterating over every valid subscription
        _.map(subScription, (item, index)=>{
            let nextDay = moment().add(1, 'days').startOf('day').add(13, 'hours').toDate();

            let order={
                userId:item.userId,
                subscriptionId:item._id,
                inventory:item.userId.defaultMeal,
                deliveryDate: nextDay
            }

            // retrieve all users previous order
            adminSchema.orders.find({userId:item.userId, subscriptionId:item._id})
            .exec(function(err, orders){
                if(err) return console.log(err)
                else{
                    //check to see if user has exhausted all his orders
                    if(item.planId.mealNumber > orders.length){
                        // check to see if an order as been made for the next day
                        let nextDayOrder= orders.filter(order=> order.deliveryDate == nextDay)
                        if(nextDayOrder.length == 0){
                            adminSchema.orders.create(order, function(err, post){
                                if(err) return res.send(err)
                                else{
                                    //send notification if  user's subscription is almost out
                                    if(item.planId.mealNumber - orders.length==1){
                                        console.log('This is your last subscription')
                                    }
                                    res.send('done')
                                }
                            })
                        }
                    }
                    else{
                        // the subscription as been fullfilled and so the subscription status as to be changed to completed
                        adminSchema.subscribedPlan.findByIdAndUpdate(item._id, {status:'completed', end:Date.now}, function(err, sub){
                            if(err)//return res.send(err)
                            return console.log('error occured '+ err) ;
                            else{
                                //send notification about subscription end
                                console.log(sub)
                            }
                        })
                    }

                }
            })

        })
    })

});
router.post('/type', function(req, res, next){
    adminSchema.type.create(req.body, function(err, post){
        if(err) return res.send(err)
        res.json(post);
    })

});
router.post('/createPlan', function(req, res, next){
    adminSchema.plan.create(req.body, function(err, post){
        if(err) return res.send(err)
        res.json(post);
    })

});
router.post('/user', function(req, res, next){
    adminSchema.user.find({$or:[{userName:req.body.userName}, {email:req.body.email}]})
    .exec(function(err, user){
        if(err) return res.send(err);
        console.log(user)
        if(user.length==0){
            adminSchema.user.create(req.body, function(err, user){
                if(err) return res.send(err)
                res.json(user);
            })
        }
        else{   res.json({error:'User Already Exist', data:user});   }
    })
});
router.put('/:id', function(req, res, next){
    console.log(req.body);
    console.log(req.body.biddingSettings);
    adminSchema.inventorySettings.findByIdAndUpdate(req.body.biddingSettings._id, req.body.biddingSettings, function(err, newPost){
        if(err)//return res.send(err)
        return console.log('error occured '+ err) ;
        adminSchema.inventory.findByIdAndUpdate(req.params.id, req.body, function(err, post){
             if(err)//return res.send(err)
             return console.log('error occured '+ err) ;
             adminSchema.tags.findByIdAndUpdate(req.body.inventoryTags._id, req.body.inventoryTags, function(err, tag){
                 if(err)//return res.send(err)
                 return console.log('error occured '+ err) ;
             })
             res.json('Update Successful')
        })
    })
    console.log('bef'+req.body.biddingSettings);



});
router.delete('/:id', function(req, res, next){
    Inventory.findByIdAndRemove(req.params.id, re.body, function(err, post){
        if(err)return res.send(err);
        res.json(post);
    })
})


module.exports = router;
