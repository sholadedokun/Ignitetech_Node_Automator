var express = require("express");
var router = express.Router();
//var mongoose = require("mongoose");
//var appSchema = require("../app/models/appSchema.js");
var nodemailer = require("nodemailer");
//var config = require("../config/config");
let _ = require("lodash");
let fs = require("fs");
let path = require("path");
let request = require("request");
//let airports = require("./airports");
//authencation
//const jwt = require("jwt-simple");
//const passportService = require("../services/passport");
//const passport = require("passport");

//email configurations
// var smtpConfig = {
//   host: "box875.bluehost.com",
//   port: 465,
//   secure: true, // use SSL
//   auth: {
//     user: "info@evrifod.com",
//     pass: "Evrifod1@"
//   }
// };
//var transporter = nodemailer.createTransport(smtpConfig);
// verify connection configuration
// transporter.verify(function(error, success) {
//    if (error) {
//         console.log(error);
//    } else {
//         console.log('Server is ready to take our messages');
//    }
// });
function prepareEmail(from, to, subject, message, bcc) {
	var mailOptions = {
		from: from, // sender address
		to: to, // list of receivers
		bcc: bcc,
		subject: subject, // Subject line
		//text: 'Dear Subscriber,', // plaintext body
		html: message // html body
	};

	// send mail with defined transport object
	transporter.sendMail(mailOptions, function(error, info) {
		if (error) {
			return console.log(error);
		}
		return "Message sent: " + info.response;
	});
}

function addDocument(key, postData, result) {
	// console.log(key);
	appSchema[key].create(postData, function(errOther, posts) {
		// console.log(errOther, posts)
		if (errOther) {
			result(errOther, null);
		} else {
			result(null, posts, key);
		}
	});
}

function updateDocument(id, update, document, result) {
	appSchema[document].findByIdAndUpdate(id, update, { upsert: true, new: true }, function(err, updates) {
		if (err) result(err, null);
		else {
			result(null, updates);
		}
	});
}
function pushDocument(id, update, document, result) {
	appSchema[document].findByIdAndUpdate(id, { $push: update }, { new: true }, function(err, updates) {
		if (err) result(err, null);
		else {
			result(null, updates);
		}
	});
}

function addFilters(req, res, next) {
	req.skip = parseInt(req.query.skip) || 0;
	req.limit = parseInt(req.query.limit) || 10;

	let conditions = req.query.filters || {};

	if (typeof conditions !== "object") conditions = JSON.parse(conditions);
	req.filters = { status: "Active" };
	for (condition in conditions) {
		req.filters[condition] = conditions[condition];
	}
	next();
}
function addOrQuery(req, res, next) {
	let queryKeys = {} || req.query.queryKeys.split(",");
	req.queryKeys = { $or: [] };
	for (key in queryKeys) {
		req.queryKeys.$or.push({ _id: queryKeys[key] });
	}
	next();
}
function tokenForUser(user) {
	const timestamp = new Date().getTime();
	return jwt.encode({ sub: user.id, iat: timestamp }, config.secret);
}
function decodeToken(token) {
	let decoded = jwt.decode(token, config.secret);
	return decoded.sub;
}
function sendSuccessMessage(res, noun, data, verb) {
	res.json({ message: `${noun} successfully ${verb}!"`, data });
}
function sendGetRequest(query, url, next) {
	request(
		{
			url: url,
			method: "GET",
			// json: true,
			body: query,
			headers: {
				Authorization: "Bearer oo0x7b6c9w46eod0xforn5c6fy",
				"Content-type": "application/json"
			}
		},
		function callback(err, res, body) {
			if (!err && res.statusCode == 200) {
				next("", JSON.parse(body));
			} else {
				next(err, "");
			}
		}
	);
}
function getUserDrive(token, next) {
	console.log("here");
	request(
		{
			url: "https://graph.microsoft.com/v2.0/me/drive/root",
			method: "GET",
			headers: {
				Authorization: "Bearer " + token
				//"Content-type": "application/json"
			}
		},
		function callback(err, res, body) {
			console.log(body);
			if (!err && res.statusCode == 200) {
				next("", JSON.parse(body));
			} else {
				next(err, "");
			}
		}
	);
}
function getUserToken(next) {
	request.post(
		{
			url: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
			form: {
				client_id: "266809ae-388c-4341-8243-9f98f189e2f1",
				scope: "https://graph.microsoft.com/.default",
				client_secret: "rynaXZHY803}++crwQTX52{",
				grant_type: "client_credentials"
			},
			headers: {
				"Content-type": "application/x-www-form-urlencoded"
			}
		},
		function callback(err, res, body) {
			console.log(body);
			if (!err && res.statusCode == 200) {
				next("", JSON.parse(body));
			} else {
				next(err, "");
			}
		}
	);
}
function getAuthorised(next) {
	request(
		{
			url: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
			method: "GET",
			form: {
				client_id: "266809ae-388c-4341-8243-9f98f189e2f1",
				// scope: "https://graph.microsoft.com/.default",
				response_type: "code",
				redirect_uri: "https://ignitetech-node-automator.herokuapp.com/appActions/receiveConsent",
				response_mode: "query",
				scope: "offline_access user.Read files.ReadWrite"
				// client_secret: "rynaXZHY803}++crwQTX52{"
				//grant_type: "client_credentials"
			}
		},
		function callback(err, res, body) {
			console.log(body);
			if (!err && res.statusCode == 200) {
				next("", body);
			} else {
				next(err, "");
			}
		}
	);
}
/* GET users listing. */
router.get("/serverDate", function(req, res, next) {
	res.json({ date: Date.now() });
});
router.get("/allSmartSheets/:id", function(req, res, next) {
	sendGetRequest("", "https://api.smartsheet.com/2.0/sheets/" + req.params.id, function(err, data) {
		if (err) res.send(err);
		res.json(data);
	});
});
/* GET users listing. */
router.get("/excelGetToken", function(req, res, next) {
	getUserToken(function(err, data) {
		if (err) res.json(err);
		getUserDrive(data.access_token, function(err, data) {
			res.json(data);
		});
	});
});
router.get("/authorise", function(req, res, next) {
	getAuthorised(function(err, data) {
		res.send(data);
	});
});
router.get("/receiveConsent", function(req, res, next) {
	console.log(req.params);
	res.json(req.params);
});

router.get("/checkLoggedin", function(req, res, next) {
	res.json(req.session.passport);
});
router.get("/logOut", function(req, res, next) {
	req.logout();
	res.send(200);
});
router.get("/plans", function(req, res, next) {
	appSchema.plan.find().exec(function(err, plans) {
		if (err) return next(err);
		res.json(plans);
	});
});
router.get("/processJson", function(req, res, next) {
	let minAirport = airports.map(item => {
		if (item.is_active) return { c: item.code, n: item.name, l: item.location };
	});
	fs.writeFile("allAirports.json", JSON.stringify(minAirrt), function(err) {
		if (err) throw err;
		console.log("Saved!");
	});
});
router.get("/getCurrentOrder", function(req, res, next) {
	appSchema.orders
		.find({ userId: decodeToken(req.headers.authorization) })
		.populate("inventory")
		.exec(function(err, orders) {
			if (err) return next(err);
			res.json(orders);
		});
});
router.get("/subScription", function(req, res, next) {
	appSchema.subscribedPlan
		.find({ userId: decodeToken(req.headers.authorization) })
		.populate("planId")
		.exec(function(err, subScription) {
			if (err) return next(err);
			res.json(subScription);
		});
});
router.get("/inventory", addFilters, addOrQuery, function(req, res, next) {
	let toPopulate = req.query.populate || "";
	console.log(req.filters, req.skip, req.limit);
	appSchema.inventory
		.find(req.filters)
		.skip(req.skip)
		.limit(req.limit)
		.populate(toPopulate)
		// .populate(
		//     {
		//         path:'inventorySettings'
		//         match:{
		//             startTimeStamp:{$lte:Date.now()},
		//             closeTimeStamp:{$gte:Date.now()}
		//         }
		//     }
		// )
		//  .where('inventorySettings.startTimeStamp').$lte(Date.now())
		//  .where('inventorySettings.closeTimeStamp').$gte(Date.now())
		.sort({ dateCreated: -1 })
		.exec(function(err, inventory) {
			if (err) return next(err);
			// inventory = inventory.filter(function(invent){
			//     if(invent.inventorySettings) return true;
			// })
			res.json(inventory);
		});
});
router.get("/category", function(req, res, next) {
	appSchema.category
		.find()
		.populate("subCategories")
		.exec(function(err, category) {
			if (err) return next(err);
			res.json(category);
		});
});
router.get("/subcategory", function(req, res, next) {
	appSchema.subcategory
		.find()
		.populate("category")
		.exec(function(err, subcategory) {
			if (err) return next(err);
			res.json(subcategory);
		});
});

//get a particular post
router.get("/inventory/:id", function(req, res, next) {
	let toPopulate = req.query.populate || "productManager inventorySettings";
	appSchema.inventory
		.findById(req.params.id)
		.populate(toPopulate)
		.exec(function(err, inventory) {
			if (err) return next(err);
			res.json(inventory);
		});
});
router.get("/category/:id", function(req, res, next) {
	appSchema.category.findById(req.params.id, function(err, category) {
		if (err) return next(err);
		res.json(category);
	});
});
router.get("/subcategory/:id", function(req, res, next) {
	appSchema.subcategory
		.find({ category: req.params.id })
		.populate("category")
		.exec(function(err, subcategory) {
			if (err) return next(err);
			res.json(subcategory);
		});
});
router.get("/userProfile", function(req, res, next) {
	appSchema.user
		.findById(decodeToken(req.headers.authorization))
		.populate("defaultMeal")
		.exec(function(err, user) {
			if (err) return next(err);
			res.json(user);
		});
});
router.get("/likes/:id", function(req, res, next) {
	let objectToFind = {};
	let populateField = req.query.type != "user" ? "user" : "";
	objectToFind[req.query.type] = req.params.id;
	console.log(objectToFind, populateField);
	appSchema.likes
		.find(objectToFind)
		.populate(populateField)
		.exec(function(err, user) {
			if (err) return next(err);
			res.json(user);
		});
});
router.get("/comments/:id", function(req, res, next) {
	let objectToFind = {};
	let populateField = req.query.type != "user" ? "user" : "";
	objectToFind[req.query.type] = req.params.id;
	appSchema.comments
		.find(objectToFind)
		.populate(populateField)
		.exec(function(err, user) {
			if (err) return next(err);
			res.json(user);
		});
});

// send a post
router.post("/inventory", function(req, res, next) {
	appSchema.inventory.create(req.body, function(err, inventory) {
		if (err) res.send(err);
		//if the inventory is added with extra features
		else if (req.body.others) {
			inventoryExtra = req.body.others;
			//take out the first feature enrty in the array
			features = inventoryExtra.shift();
			features.title = features.title.replace(" ", "");
			nextFeatures(features);
			function nextFeatures(Features) {
				// extract the features from the object value
				var FeaturesValue = Features.value;
				var totalFeatures = Features.value.length;

				saveAll();
				function saveAll() {
					var update = {};
					//extract the first feature from the features
					currentFeatures = FeaturesValue.shift();
					//assign the inventory's Id so that it can be easily referenced later
					currentFeatures.inventoryId = inventory._id;

					//send the features off to be added to the datbase
					addDocument(Features.title, currentFeatures, function(err, result, dkey) {
						if (err) res.send(err);
						else {
							//set the returned id with the update object for the inventory's update task
							update[dkey] = result._id;
							//update the inventory
							pushDocument(inventory._id, update, "inventory", function(err, updatedInventory) {
								if (err) res.send(err);
								else {
									//check if there are still features remaining to add
									if (--totalFeatures) {
										saveAll(); //then make a recursive call
									} else {
										// get a new extra feature
										newFeature = inventoryExtra.shift();

										//if there exists an extra feature then make a recursive call
										if (newFeature) nextFeatures(newFeature);
										else {
											//else we are done with the features
											if (req.body.reviewQuestions) {
												var totalQuest = 0;

												for (index in req.body.reviewQuestions) {
													const { title, questions } = req.body.reviewQuestions[index];
													var reviewQuestions = new appSchema.reviewQuestions();
													reviewQuestions.title = title;
													reviewQuestions.questionText = questions;
													reviewQuestions.inventoryId = inventory._id;
													reviewQuestions.save((err, result) => {
														if (err) res.send(err);
														else {
															totalQuest++;
															if (req.body.reviewQuestions.length === totalQuest) sendSuccessMessage(res, "Inventory", updatedInventory, "Added");
														}
													});
												}
											} else {
												sendSuccessMessage(res, "Inventory", updatedInventory, "Added");
											}
										}
									}
								}
							});
						}
					});
				}
			}
		} else {
			res.json({ message: "Inventory successfully Added!", inventory });
		}
	});
});
router.post("/subscribeToPlan/:id", function(req, res, next) {
	let body = { userId: decodeToken(req.headers.authorization), planId: req.params.id };
	appSchema.subscribedPlan.create(body, function(err, post) {
		if (err) res.send(err);
		else {
			appSchema.subscribedPlan.find({ userId: decodeToken(req.headers.authorization) }).exec(function(err, plans) {
				if (err) return next(err);
				res.json(plans);
			});
		}
	});
});
router.post("/deliveryAddress", function(req, res, next) {
	req.body.userId = decodeToken(req.headers.authorization);
	appSchema.deliveryAddress.create(req.body, function(err, post) {
		if (err) return next(err);
		else {
			updateDocument(req.body.userId, { currentDeliveryAddress: post._id }, "user", function(err, post) {
				if (err) return next(err);
				res.json({ message: "Delivery Address update was successfully", deliveryAdd: post });
			});
		}
	});
});
router.post("/signup", function(req, res, next) {
	var newuser = new appSchema.user(req.body);
	newuser.save(function(err) {
		if (err) res.status(422).send({ error: err });
		// fetch user and test password verification
		appSchema.user.findOne({ $or: [{ email: req.body.email }] }, function(err, userData) {
			if (err) res.status(422).send({ error: err });

			// test a matching password
			userData.comparePassword(req.body.password, function(err, isMatch) {
				if (err) res.status(422).send({ error: err });
				if (isMatch) {
					// Repond to request indicating the user was created
					res.json({ token: tokenForUser(userData) });
				}
			});
		});
	});
});
router.post("/contact", function(req, res, next) {
	var params = req.body;
	console.log(params);
	var emailbody = "<b>Dear " + params.name + ", </b> <br>";
	emailbody += "Thank you for contacting us. Our representative will contact you shortly.";
	emailbody += "<br><br><b>Evrifod Team</b>";
	var fromE = "Evrifod <info@evrifod.com>";
	var subject = "Thanks for contacting Evrifod ";
	console.log(prepareEmail(fromE, params.email, subject, emailbody));

	subject = "An Online User contacted you.";
	emailbody = "Dear Admin,<br> <br>";
	emailbody += "Find below User details:";
	emailbody += "<br><b>User Email:</b> " + params.email;
	emailbody += "<br><b>User Name:</b>" + params.name;
	emailbody += "<br><b>User Phone Number:</b>" + params.phone;
	emailbody += "<br><b>User Message:<b> " + params.message;
	fromE = "Evrifod Webmaster<info@evrifod.com>";
	bcc = "sholadedokun@yahoo.com";
	to = "info@evrifod.com";
	res.json(prepareEmail(fromE, to, subject, emailbody, bcc));
});
router.post("/addSubscriber", function(req, res, next) {
	appSchema.emailSubscriber.find({ emailAddress: req.body.emailAddress }).exec(function(err, emailSubscriber) {
		if (err) return next(err);
		console.log(emailSubscriber.length);
		var subject;
		var emailbody;

		if (emailSubscriber.length == 0) {
			appSchema.emailSubscriber.create(req.body, function(err, emailSubscriber) {
				if (err) return next(err);
				//res.json(emailSubscriber);
				// setup e-mail data with unicode symbols
				emailbody = "<b>Dear Subscriber, </b> <br>";
				emailbody += "Thank you for subscribing to our Newsletter. We are glad to have you on board.";
				emailbody += "<br><br><b>Evrifod Team</b>";
				subject = "Thanks for subscribing to our Newsletter.";
			});
			res.json(prepareEmail("Evrifod <info@evrifod.com>", req.body.emailAddress, subject, emailbody));
		} else {
			res.json({ error: "You have already subscribed, thanks for trying again", data: emailSubscriber });
		}
	});
});
// router.post("/signin", passport.authenticate("local", { session: false }), function(req, res, next) {
// 	res.send({ token: tokenForUser(req.user) });
// });
router.post("/likes", function(req, res, next) {
	appSchema.likes.create(req.body, function(err, post) {
		if (err) res.send(err);
		appSchema.likes.find({ objectId: post.objectId }, function(err, object) {
			if (err) return next(err);
			res.json({ message: "Post was successfully liked", id: post.id, totalLikes: object.length });
		});
	});
});
router.post("/placeOrder", function(req, res, next) {
	req.body.userId = decodeToken(req.headers.authorization);
	order = new appSchema.orders(req.body);
	order.save((err, result) => {
		if (err) res.send(err);
		else {
			res.json(result);
		}
	});
});

router.put("/:id", function(req, res, next) {
	Inventory.findByIdAndUpdate(req.params.id, req.body, function(err, post) {
		if (err) return next(err);
		res.json(post);
	});
});
router.put("/userProfile", function(req, res, next) {
	console.log("here");
	updateDocument(decodeToken(req.headers.authorization), req.body, "user", function(err, post) {
		if (err) res.json({ error: err });
		res.json({ message: "Userprofile Update was successfully", comment: post });
	});
});
router.put("/comments/:id", function(req, res, next) {
	console.log("here");
	res.json({ ther: "here" });
});
router.delete("/:id", function(req, res, next) {
	Inventory.findByIdAndRemove(req.params.id, req.body, function(err, post) {
		if (err) return next(err);
		res.json(post);
	});
});
router.delete("/likes/:id", function(req, res, next) {
	appSchema.likes.findByIdAndRemove(req.params.id, { user: req.body.user }, function(err, post) {
		if (err) return next(err);
		appSchema.likes.find({ objectId: post.objectId }, function(err, object) {
			if (err) return next(err);
			res.json({ message: "Post was successfully removed", totalLikes: object.length });
		});
	});
});
router.delete("/comments/:id", function(req, res, next) {
	appSchema.comments.findByIdAndRemove(req.params.id, { user: req.body.user }, function(err, post) {
		if (err) return next(err);
		appSchema.comments.find({ objectId: post.objectId }, function(err, object) {
			if (err) return next(err);
			res.json({ message: "Post comments was successfully removed", totalComments: object.length });
		});
	});
});

module.exports = router;
