import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { firestore } from "firebase-admin";
import algoliasearch from "algoliasearch";

admin.initializeApp();

//Initialize Algolia
//App ID and API Key are stored in functions config variables
const ALGOLIA_ID = functions.config().algolia.app_id;
const ALGOLIA_ADMIN_KEY = functions.config().algolia.api_key;
//const ALGOLIA_SEARCH_KEY = functions.config().algolia.search_key;

const ALGOLIA_INDEX_NAME = "search_ORDERS";
const client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);
const admins = new Set()
    .add("kkll.kl251@gmail.com")
    .add("jan@dropshipr.dk")
    .add("jan.rosendahl16@gmail.com");


export const createOrdersIndex = functions.https.onRequest((request, response) => {
    let orderIndices: any[] = [];
    admin.firestore().collection("orders").get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                const order = doc.data();
                let orderIndex = {
                    objectID: doc.id,
                    visible_ref: order.visible_ref,
                    productSKUS: order.productSKUS,
                    delivery_address:
                    {
                        att_contact: order.delivery_address?.att_contact
                    },
                    created_at: order.created_at,
                    ownerUserIds: order.ownerUserIds ? order.ownerUserIds : [],
                    billing_address: order.billing_address
                };
                orderIndices.push(orderIndex);
            });
            const index = client.initIndex(ALGOLIA_INDEX_NAME);
            index.clearObjects().then((success) => {
                return index.saveObjects(orderIndices)
                    .then(({ objectIDs }) => {
                        objectIDs.push("Total " + snapshot.docs.length + " orders are indexed");
                        response.send(objectIDs);
                    });
            }).catch((err) => {
                response.status(500).send(err);
            });

        }).catch(err => {
            response.status(500).send(err);
        })
});

exports.AddAlgoliaIndexAfterOrderCreate = functions.firestore.document('orders/{orderId}')
    .onCreate((snap, context) => {
        const newOrder = snap.data();
        let orderIndex = {
            objectID: snap.id,
            visible_ref: newOrder.visible_ref,
            productSKUS: newOrder.productSKUS,
            delivery_address:
            {
                att_contact: newOrder.delivery_address?.att_contact
            },
            created_at: newOrder.created_at,
            ownerUserIds: newOrder.ownerUserIds ? newOrder.ownerUserIds : [],
            billing_address: newOrder.billing_address
        };

        const index = client.initIndex(ALGOLIA_INDEX_NAME);
        return index.saveObject(orderIndex)
            .then(index => {
                console.log("Algolia index added after order create, orderId: " + index.objectID);
            })
            .catch(err => {
                console.log("Error occurred while adding Algolia index after order create, orderId: " + snap.id);
            });
    });

exports.UpdateAlgoliaIndexAfterOrderUpdate = functions.firestore.document('orders/{orderId}')
    .onUpdate((change, context) => {
        const newOrder = change.after.data();
        let orderIndex = {
            objectID: change.after.id,
            visible_ref: newOrder.visible_ref,
            productSKUS: newOrder.productSKUS,
            delivery_address:
            {
                att_contact: newOrder.delivery_address?.att_contact
            },
            created_at: newOrder.created_at,
            ownerUserIds: newOrder.ownerUserIds ? newOrder.ownerUserIds : [],
            billing_address: newOrder.billing_address
        };

        const index = client.initIndex(ALGOLIA_INDEX_NAME);
        return index.saveObject(orderIndex)
            .then(index => {
                console.log("Algolia index updated after order update, orderId: " + index.objectID);
            })
            .catch(err => {
                console.log("Error occurred while updating Algolia index after order update, orderId: " + change.after.id);
            });
    });

exports.DeleteAlgoliaIndexAfterOrderDelete = functions.firestore.document('orders/{orderId}')
    .onDelete((snap, context) => {

        const index = client.initIndex(ALGOLIA_INDEX_NAME);
        return index.deleteObject(snap.id)
            .then(index => {
                console.log("Algolia index deleted after order delete, orderId: " + snap.id);
            })
            .catch(err => {
                console.log("Error occurred while deleting Algolia index after order delete, orderId: " + snap.id);
            });
    });

exports.PopulateUserRolesCollection = functions.https.onRequest((request, response) => {
    let count: number = 0;
    const listAllUsers = (nextPageToken: string | undefined): Promise<any> => {
        // List batch of users, 1000 at a time.
        return admin
            .auth()
            .listUsers(1000, nextPageToken)
            .then((listUsersResult) => {
                count += listUsersResult.users.length;
                listUsersResult.users.forEach((userRecord) => {
                    //console.log('user', userRecord.toJSON());
                    admin.firestore().doc("userRoles/" + userRecord.uid)
                        .get().then((docSnapshot) => {
                            if (docSnapshot.exists) {
                                admin.firestore().collection("userRoles")
                                    .doc(userRecord.uid)
                                    .set({
                                        email: userRecord.email,
                                        displayName: userRecord.displayName
                                    }, { merge: true });
                            }
                            else {
                                let role: string = "";
                                if (userRecord.email && admins.has(userRecord.email)) {
                                    role = "admin";
                                }
                                admin.firestore().collection("userRoles")
                                    .doc(userRecord.uid)
                                    .set({
                                        uid: userRecord.uid,
                                        email: userRecord.email,
                                        displayName: userRecord.displayName,
                                        role: role,
                                        webshopIDs: [],
                                        warehouseIDs: []
                                    });
                            }
                        });
                });
                if (listUsersResult.pageToken) {
                    // List next batch of users.
                    return listAllUsers(listUsersResult.pageToken);
                }
                else {
                    return Promise.resolve();
                }
            })
            .catch((error) => {
                return Promise.reject(error);
            });
    };
    // Start listing users from the beginning, 1000 at a time.

    return listAllUsers(undefined).then(() => {
        console.log("Finished populating users userRoles, total users = ", count);
    }, (error) => {
        console.log('Error listing users:', error);
    });
});

exports.OnUserCreate = functions.auth.user().onCreate((userRecord) => {

    return admin.firestore().doc("userRoles/" + userRecord.uid)
        .set({
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName,
            role: "webshop",
            webshopIDs: [],
            warehouseIDs: []
        })
        .then((result) => {
            console.log(userRecord.email + ": user created in userRoles collection at " + result.writeTime)
        })
        .catch(err => {
            console.log('Error creating userRoles: ', err);
        });

});

exports.OnUserDelete = functions.auth.user().onDelete((userRecord) => {
    return admin.firestore().doc("userRoles/" + userRecord.uid).delete()
        .then((result) => {
            console.log(userRecord.email + ": user deleted from userRoles collection at " + result.writeTime);
        });

});

exports.OnUserRoleCreate = functions.firestore.document('userRoles/{userId}')
    .onCreate((sanp, context) => {
        const userId = sanp.id;
        const userRole = sanp.data();

        let promiseList: Promise<any>[] = [];
        //webshop part
        if (userRole.webshopIDs && userRole.webshopIDs.length > 0) {
            userRole.webshopIDs.forEach((webshopId: string) => {
                let insertOpPromise = admin.firestore().collection("webshop").doc(webshopId)
                    .get()
                    .then((webshopSnap) => {
                        let promises: Promise<any>[] = [];
                        if (webshopSnap.exists) {
                            let webshop: any = webshopSnap.data();
                            if (webshop && webshop.order_channel_id) {
                                let ordersPromise = admin.firestore().collection("orders").where("order_channel_id", "==", webshop.order_channel_id).get()
                                    .then((snapshot) => {
                                        if (!snapshot.empty) {
                                            let writePromises: Promise<any>[] = [];
                                            snapshot.docs.forEach((orderSnap) => {
                                                //Add userId to each order document's ownerUserIds field
                                                let order = orderSnap.data();
                                                if (order.ownerUserIds && order.ownerUserIds.length > 0) {

                                                    let writePromise = orderSnap.ref.set({
                                                        ownerUserIds: firestore.FieldValue.arrayUnion(userId)
                                                    },
                                                        {
                                                            merge: true
                                                        })
                                                        .then((result) => {

                                                        });
                                                    writePromises.push(writePromise);
                                                } else {

                                                    let writePromise = orderSnap.ref.set({
                                                        ownerUserIds: [userId]
                                                    },
                                                        {
                                                            merge: true
                                                        })
                                                        .then((result) => {

                                                        });
                                                    writePromises.push(writePromise);
                                                }

                                            });
                                            return Promise.all(writePromises).then((result) => {
                                                functions.logger.log("Success adding ownerUserIds in order, webshop");
                                            });
                                        }
                                        return Promise.resolve();
                                    });
                                promises.push(ordersPromise);

                                let productPromise = admin.firestore().collection("product")
                                    .where("order_channel_id", "==", webshop.order_channel_id)
                                    .get()
                                    .then((snapshot) => {
                                        if (!snapshot.empty) {
                                            let writePromises: Promise<any>[] = [];
                                            snapshot.docs.forEach((productSnap) => {
                                                if (productSnap.exists) {
                                                    let product = productSnap.data();
                                                    let writePromise: Promise<any>;
                                                    if (product.ownerUserIds) {
                                                        writePromise = productSnap.ref.set({
                                                            ownerUserIds: firestore.FieldValue.arrayUnion(userId)
                                                        },
                                                            {
                                                                merge: true
                                                            })
                                                            .then((result) => {

                                                            });
                                                    } else {
                                                        writePromise = productSnap.ref.set({
                                                            ownerUserIds: [userId]
                                                        },
                                                            {
                                                                merge: true
                                                            })
                                                            .then((result) => {

                                                            });
                                                    }
                                                    writePromises.push(writePromise);
                                                }

                                            });
                                        }
                                        return Promise.resolve();
                                    });
                                promises.push(productPromise);

                                return Promise.all(promises).then((result) => {

                                }).catch((err) => {
                                    functions.logger.log("Error writing ownerUserIds in orders and product", err);
                                });

                            }
                        }
                        return Promise.resolve();
                    });
                promiseList.push(insertOpPromise);
            });

        }

        //warehouse part
        if (userRole.warehouseIDs && userRole.warehouseIDs.length > 0) {
            userRole.warehouseIDs.forEach((warehouseId: string) => {
                let warehouseOpPromise = admin.firestore().collection("warehouse").doc(warehouseId).get()
                    .then((warehouseSnap) => {
                        if (warehouseSnap.exists) {
                            let warehouse = warehouseSnap.data();
                            if (warehouse && warehouse.webshops) {
                                if (warehouse.webshops.length && warehouse.webshops.length > 0) {
                                    let warehouseWebshopPromise: Promise<any>[] = [];
                                    warehouse.webshops.forEach((webshopId: string) => {
                                        let insertOpPromise = admin.firestore().collection("webshop").doc(webshopId)
                                            .get()
                                            .then((webshopSnap) => {
                                                let promises: Promise<any>[] = [];
                                                if (webshopSnap.exists) {
                                                    let webshop: any = webshopSnap.data();
                                                    if (webshop && webshop.order_channel_id) {
                                                        let orderPromise = admin.firestore().collection("orders").where("order_channel_id", "==", webshop.order_channel_id).get()
                                                            .then((snapshot) => {
                                                                if (!snapshot.empty) {
                                                                    let writePromises: Promise<any>[] = [];
                                                                    snapshot.docs.forEach((orderSnap) => {
                                                                        //Add userId to each order document's ownerUserIds field
                                                                        let order = orderSnap.data();
                                                                        if (order.ownerUserIds && order.ownerUserIds.length > 0) {

                                                                            let writePromise = orderSnap.ref.set({
                                                                                ownerUserIds: firestore.FieldValue.arrayUnion(userId)
                                                                            },
                                                                                {
                                                                                    merge: true
                                                                                })
                                                                                .then((result) => {

                                                                                });
                                                                            writePromises.push(writePromise);
                                                                        } else {

                                                                            let writePromise = orderSnap.ref.set({
                                                                                ownerUserIds: [userId]
                                                                            },
                                                                                {
                                                                                    merge: true
                                                                                })
                                                                                .then((result) => {

                                                                                });
                                                                            writePromises.push(writePromise);
                                                                        }

                                                                    });
                                                                    return Promise.all(writePromises).then((result) => {
                                                                        functions.logger.log("Success adding ownerUserIds in order and product, warehouse's webshop");
                                                                    })
                                                                        .catch((err) => {
                                                                            functions.logger.log("Error adding ownerUserIds in order and product, warehouse's webshop", err);
                                                                        });
                                                                }
                                                                return Promise.resolve();
                                                            });
                                                        promises.push(orderPromise);

                                                        let productPromise = admin.firestore().collection("product")
                                                            .where("order_channel_id", "==", webshop.order_channel_id)
                                                            .get()
                                                            .then((snapshot) => {
                                                                if (!snapshot.empty) {
                                                                    let writePromises: Promise<any>[] = [];
                                                                    snapshot.docs.forEach((productSnap) => {
                                                                        if (productSnap.exists) {
                                                                            let product = productSnap.data();
                                                                            let writePromise: Promise<any>;
                                                                            if (product.ownerUserIds) {
                                                                                writePromise = productSnap.ref.set({
                                                                                    ownerUserIds: firestore.FieldValue.arrayUnion(userId)
                                                                                },
                                                                                    {
                                                                                        merge: true
                                                                                    })
                                                                                    .then((result) => {

                                                                                    });
                                                                            } else {
                                                                                writePromise = productSnap.ref.set({
                                                                                    ownerUserIds: [userId]
                                                                                },
                                                                                    {
                                                                                        merge: true
                                                                                    })
                                                                                    .then((result) => {

                                                                                    });
                                                                            }
                                                                            writePromises.push(writePromise);
                                                                        }

                                                                    });
                                                                }
                                                                return Promise.resolve();
                                                            });
                                                        promises.push(productPromise);

                                                        return Promise.all(promises).then((result) => {

                                                        }).catch((err) => {
                                                            functions.logger.log("Error writing ownerUserIds in orders and product for the warehouse", err);
                                                        });
                                                    }
                                                }
                                                return Promise.resolve();
                                            });
                                        warehouseWebshopPromise.push(insertOpPromise);

                                        //Add webshopId to userRole webshopIDs array
                                        let userRolesPromise = sanp.ref.set({
                                            webshopIDs: firestore.FieldValue.arrayUnion(webshopId)
                                        },
                                            {
                                                merge: true
                                            }).then((result) => {

                                            });
                                        warehouseWebshopPromise.push(userRolesPromise);
                                    });
                                    return Promise.all(warehouseWebshopPromise).then((result) => {
                                    }).catch((err) => {
                                        functions.logger.log("Error adding warehouse webshops orders & product ==> ownerUserIds", err);
                                    });
                                }
                            }
                        }
                        return Promise.resolve();
                    });
                promiseList.push(warehouseOpPromise);
            });
        }
        return Promise.all(promiseList).then((result) => {
            functions.logger.log("UserRolesCreate completed successfully");
        }).catch((err) => {
            functions.logger.log("UserRolesCreate completed with errors", err);
        });
    });

exports.UserRoleDelete = functions.firestore.document('userRoles/{userId}')
    .onDelete((sanp, context) => {
        const userId = sanp.id;
        const userRole = sanp.data();

        let promiseList: Promise<any>[] = [];

        //webshop part
        if (userRole.webshopIDs && userRole.webshopIDs.length > 0) {
            userRole.webshopIDs.forEach((webshopId: string) => {
                let deleteOpPromise = admin.firestore().collection("webshop").doc(webshopId)
                    .get()
                    .then((webshopSnap) => {
                        let promises: Promise<any>[] = [];
                        if (webshopSnap.exists) {
                            let webshop: any = webshopSnap.data();
                            if (webshop && webshop.order_channel_id) {
                                let ordersPromise = admin.firestore().collection("orders").where("order_channel_id", "==", webshop.order_channel_id).get()
                                    .then((snapshot) => {
                                        if (!snapshot.empty) {
                                            let writePromises: Promise<any>[] = [];
                                            snapshot.docs.forEach((orderSnap) => {
                                                //Add userId to each order document's ownerUserIds field
                                                let order = orderSnap.data();
                                                if (order.ownerUserIds && order.ownerUserIds.length > 0) {
                                                    let writePromise = orderSnap.ref.set({
                                                        ownerUserIds: firestore.FieldValue.arrayRemove(userId)
                                                    },
                                                        {
                                                            merge: true
                                                        })
                                                        .then((result) => {

                                                        });
                                                    writePromises.push(writePromise);
                                                } else {
                                                    let writePromise = orderSnap.ref.set({
                                                        ownerUserIds: []
                                                    },
                                                        {
                                                            merge: true
                                                        })
                                                        .then((result) => {

                                                        });
                                                    writePromises.push(writePromise);
                                                }

                                            });
                                            return Promise.all(writePromises).then((result) => {

                                            })
                                                .catch((err) => {
                                                    functions.logger.log("Error deleting ownerUserIds in order and product, webshop", err);
                                                });
                                        }
                                        return Promise.resolve();
                                    });
                                promises.push(ordersPromise);

                                let productPromise = admin.firestore().collection("product")
                                    .where("order_channel_id", "==", webshop.order_channel_id)
                                    .get()
                                    .then((snapshot) => {
                                        if (!snapshot.empty) {
                                            let writePromises: Promise<any>[] = [];
                                            snapshot.docs.forEach((productSnap) => {
                                                if (productSnap.exists) {
                                                    let product = productSnap.data();
                                                    let writePromise: Promise<any>;
                                                    if (product.ownerUserIds) {
                                                        writePromise = productSnap.ref.set({
                                                            ownerUserIds: firestore.FieldValue.arrayRemove(userId)
                                                        },
                                                            {
                                                                merge: true
                                                            })
                                                            .then((result) => {

                                                            });
                                                    } else {
                                                        writePromise = productSnap.ref.set({
                                                            ownerUserIds: []
                                                        },
                                                            {
                                                                merge: true
                                                            })
                                                            .then((result) => {

                                                            });
                                                    }
                                                    writePromises.push(writePromise);
                                                }

                                            });
                                        }
                                        return Promise.resolve();
                                    });
                                promises.push(productPromise);

                                return Promise.all(promises).then((result) => {

                                }).catch((err) => {
                                    functions.logger.log("Error writing ownerUserIds in orders and product", err);
                                });
                            }
                        }
                        return Promise.resolve();
                    });

                promiseList.push(deleteOpPromise);
            });

        }

        //warehouse part
        if (userRole.warehouseIDs && userRole.warehouseIDs.length > 0) {
            userRole.warehouseIDs.forEach((warehouseId: string) => {
                let warehouseOpPromise = admin.firestore().collection("warehouse").doc(warehouseId).get()
                    .then((warehouseSnap) => {
                        if (warehouseSnap.exists) {
                            let warehouse = warehouseSnap.data();
                            if (warehouse && warehouse.webshops) {
                                if (warehouse.webshops.length && warehouse.webshops.length > 0) {
                                    let warehouseWebshopPromise: Promise<any>[] = [];
                                    warehouse.webshops.forEach((webshopId: string) => {
                                        let deleteOpPromise = admin.firestore().collection("webshop").doc(webshopId)
                                            .get()
                                            .then((webshopSnap) => {
                                                let promises: Promise<any>[] = [];
                                                if (webshopSnap.exists) {
                                                    let webshop: any = webshopSnap.data();
                                                    if (webshop && webshop.order_channel_id) {
                                                        let ordersPromise = admin.firestore().collection("orders").where("order_channel_id", "==", webshop.order_channel_id).get()
                                                            .then((snapshot) => {
                                                                if (!snapshot.empty) {
                                                                    let writePromises: Promise<any>[] = [];
                                                                    snapshot.docs.forEach((orderSnap) => {
                                                                        //Remove userId from each order document's ownerUserIds field
                                                                        let order = orderSnap.data();
                                                                        if (order.ownerUserIds && order.ownerUserIds.length > 0) {

                                                                            let writePromise = orderSnap.ref.set({
                                                                                ownerUserIds: firestore.FieldValue.arrayRemove(userId)
                                                                            },
                                                                                {
                                                                                    merge: true
                                                                                })
                                                                                .then((result) => {

                                                                                });
                                                                            writePromises.push(writePromise);
                                                                        } else {

                                                                            let writePromise = orderSnap.ref.set({
                                                                                ownerUserIds: []
                                                                            },
                                                                                {
                                                                                    merge: true
                                                                                })
                                                                                .then((result) => {

                                                                                });
                                                                            writePromises.push(writePromise);
                                                                        }

                                                                    });
                                                                    return Promise.all(writePromises).then((result) => {
                                                                        functions.logger.log("Success removing ownerUserIds in order and product, warehouse's webshop");
                                                                    })
                                                                        .catch((err) => {
                                                                            functions.logger.log("Error removing ownerUserIds in order and product, warehouse's webshop", err);
                                                                        });
                                                                }
                                                                return Promise.resolve();
                                                            });
                                                        promises.push(ordersPromise);

                                                        let productPromise = admin.firestore().collection("product")
                                                            .where("order_channel_id", "==", webshop.order_channel_id)
                                                            .get()
                                                            .then((snapshot) => {
                                                                if (!snapshot.empty) {
                                                                    let writePromises: Promise<any>[] = [];
                                                                    snapshot.docs.forEach((productSnap) => {
                                                                        if (productSnap.exists) {
                                                                            let product = productSnap.data();
                                                                            let writePromise: Promise<any>;
                                                                            if (product.ownerUserIds) {
                                                                                writePromise = productSnap.ref.set({
                                                                                    ownerUserIds: firestore.FieldValue.arrayRemove(userId)
                                                                                },
                                                                                    {
                                                                                        merge: true
                                                                                    })
                                                                                    .then((result) => {

                                                                                    });
                                                                            } else {
                                                                                writePromise = productSnap.ref.set({
                                                                                    ownerUserIds: []
                                                                                },
                                                                                    {
                                                                                        merge: true
                                                                                    })
                                                                                    .then((result) => {

                                                                                    });
                                                                            }
                                                                            writePromises.push(writePromise);
                                                                        }

                                                                    });
                                                                }
                                                                return Promise.resolve();
                                                            });
                                                        promises.push(productPromise);

                                                        return Promise.all(promises).then((result) => {

                                                        }).catch((err) => {
                                                            functions.logger.log("Error writing ownerUserIds in orders and product for the warehouse", err);
                                                        });
                                                    }
                                                }
                                                return Promise.resolve();
                                            });
                                        warehouseWebshopPromise.push(deleteOpPromise);

                                        //Remove webshopId from userRole webshopIDs array
                                        let userRolesPromise = sanp.ref.set({
                                            webshopIDs: firestore.FieldValue.arrayRemove(webshopId)
                                        },
                                            {
                                                merge: true
                                            }).then((result) => {

                                            });
                                        warehouseWebshopPromise.push(userRolesPromise);
                                    });
                                    return Promise.all(warehouseWebshopPromise).then((result) => {
                                        functions.logger.log("Success removing warehouse webshops orders & product ==> ownerUserIds");
                                    }).catch((err) => {
                                        functions.logger.log("Error removing warehouse webshops orders & product ==> ownerUserIds", err);
                                    });
                                }
                            }
                        }
                        return Promise.resolve();
                    });
                promiseList.push(warehouseOpPromise);
            });
        }
        return Promise.all(promiseList).then((result) => {
            functions.logger.log("UserRolesDelete completed successfully");
        }).catch((err) => {
            functions.logger.log("UserRolesDelete completed with errors", err);
        });
    });

exports.OnUserRoleUpdate = functions.firestore.document('userRoles/{userId}')
    .onUpdate((sanp, context) => {
        const userId = sanp.before.id;
        const userRoleOld = sanp.before.data(),
            userRoleNew = sanp.after.data();

        const oldWebshopIDs: string[] = userRoleOld.webshopIDs,
            newWebshopIDs: string[] = userRoleNew.webshopIDs;

        let webshopIdsToInsert = newWebshopIDs.filter(id => !oldWebshopIDs.includes(id)),
            webshopIdsToDelete = oldWebshopIDs.filter(id => !newWebshopIDs.includes(id));

        let promiseList: Promise<any>[] = [];

        if (webshopIdsToInsert.length > 0) {

            webshopIdsToInsert.forEach((webshopId: string) => {
                let insertOpPromise = admin.firestore().collection("webshop").doc(webshopId)
                    .get()
                    .then((webshopSnap) => {
                        let promises: Promise<any>[] = [];
                        if (webshopSnap.exists) {
                            let webshop: any = webshopSnap.data();
                            if (webshop && webshop.order_channel_id) {
                                let ordersPromise = admin.firestore().collection("orders").where("order_channel_id", "==", webshop.order_channel_id).get()
                                    .then((snapshot) => {
                                        if (!snapshot.empty) {
                                            let writePromises: Promise<any>[] = [];
                                            snapshot.docs.forEach((orderSnap) => {
                                                //Add userId to each order document's ownerUserIds field
                                                let order = orderSnap.data();
                                                if (order.ownerUserIds && order.ownerUserIds.length > 0) {

                                                    let writePromise = orderSnap.ref.set({
                                                        ownerUserIds: firestore.FieldValue.arrayUnion(userId)
                                                    },
                                                        {
                                                            merge: true
                                                        })
                                                        .then((result) => {

                                                        });
                                                    writePromises.push(writePromise);
                                                } else {

                                                    let writePromise = orderSnap.ref.set({
                                                        ownerUserIds: [userId]
                                                    },
                                                        {
                                                            merge: true
                                                        })
                                                        .then((result) => {

                                                        });
                                                    writePromises.push(writePromise);
                                                }

                                            });
                                            return Promise.all(writePromises).then((result) => {
                                                functions.logger.log("Success adding ownerUserIds in order, webshop");
                                            });
                                        }
                                        return Promise.resolve();
                                    });
                                promises.push(ordersPromise);

                                let productPromise = admin.firestore().collection("product")
                                    .where("order_channel_id", "==", webshop.order_channel_id)
                                    .get()
                                    .then((snapshot) => {
                                        if (!snapshot.empty) {
                                            let writePromises: Promise<any>[] = [];
                                            snapshot.docs.forEach((productSnap) => {
                                                if (productSnap.exists) {
                                                    let product = productSnap.data();
                                                    let writePromise: Promise<any>;
                                                    if (product.ownerUserIds) {
                                                        writePromise = productSnap.ref.set({
                                                            ownerUserIds: firestore.FieldValue.arrayUnion(userId)
                                                        },
                                                            {
                                                                merge: true
                                                            })
                                                            .then((result) => {

                                                            });
                                                    } else {
                                                        writePromise = productSnap.ref.set({
                                                            ownerUserIds: [userId]
                                                        },
                                                            {
                                                                merge: true
                                                            })
                                                            .then((result) => {

                                                            });
                                                    }
                                                    writePromises.push(writePromise);
                                                }

                                            });
                                        }
                                        return Promise.resolve();
                                    });
                                promises.push(productPromise);

                                return Promise.all(promises).then((result) => {

                                }).catch((err) => {
                                    functions.logger.log("Error writing ownerUserIds in orders and product", err);
                                });

                            }
                        }
                        return Promise.resolve();
                    });
                promiseList.push(insertOpPromise);
            });
        }

        if (webshopIdsToDelete.length > 0) {
            webshopIdsToDelete.forEach((webshopId: string) => {
                let deleteOpPromise = admin.firestore().collection("webshop").doc(webshopId)
                    .get()
                    .then((webshopSnap) => {
                        let promises: Promise<any>[] = [];
                        if (webshopSnap.exists) {
                            let webshop: any = webshopSnap.data();
                            if (webshop && webshop.order_channel_id) {
                                let ordersPromise = admin.firestore().collection("orders").where("order_channel_id", "==", webshop.order_channel_id).get()
                                    .then((snapshot) => {
                                        if (!snapshot.empty) {
                                            let writePromises: Promise<any>[] = [];
                                            snapshot.docs.forEach((orderSnap) => {
                                                //Add userId to each order document's ownerUserIds field
                                                let order = orderSnap.data();
                                                if (order.ownerUserIds && order.ownerUserIds.length > 0) {
                                                    let writePromise = orderSnap.ref.set({
                                                        ownerUserIds: firestore.FieldValue.arrayRemove(userId)
                                                    },
                                                        {
                                                            merge: true
                                                        })
                                                        .then((result) => {

                                                        });
                                                    writePromises.push(writePromise);
                                                } else {
                                                    let writePromise = orderSnap.ref.set({
                                                        ownerUserIds: []
                                                    },
                                                        {
                                                            merge: true
                                                        })
                                                        .then((result) => {

                                                        });
                                                    writePromises.push(writePromise);
                                                }

                                            });
                                            return Promise.all(writePromises).then((result) => {

                                            })
                                                .catch((err) => {
                                                    functions.logger.log("Error deleting ownerUserIds in order and product, webshop", err);
                                                });
                                        }
                                        return Promise.resolve();
                                    });
                                promises.push(ordersPromise);

                                let productPromise = admin.firestore().collection("product")
                                    .where("order_channel_id", "==", webshop.order_channel_id)
                                    .get()
                                    .then((snapshot) => {
                                        if (!snapshot.empty) {
                                            let writePromises: Promise<any>[] = [];
                                            snapshot.docs.forEach((productSnap) => {
                                                if (productSnap.exists) {
                                                    let product = productSnap.data();
                                                    let writePromise: Promise<any>;
                                                    if (product.ownerUserIds) {
                                                        writePromise = productSnap.ref.set({
                                                            ownerUserIds: firestore.FieldValue.arrayRemove(userId)
                                                        },
                                                            {
                                                                merge: true
                                                            })
                                                            .then((result) => {

                                                            });
                                                    } else {
                                                        writePromise = productSnap.ref.set({
                                                            ownerUserIds: []
                                                        },
                                                            {
                                                                merge: true
                                                            })
                                                            .then((result) => {

                                                            });
                                                    }
                                                    writePromises.push(writePromise);
                                                }

                                            });
                                        }
                                        return Promise.resolve();
                                    });
                                promises.push(productPromise);

                                return Promise.all(promises).then((result) => {

                                }).catch((err) => {
                                    functions.logger.log("Error writing ownerUserIds in orders and product", err);
                                });
                            }
                        }
                        return Promise.resolve();
                    });

                promiseList.push(deleteOpPromise);
            });
        }

        //warehouse part
        const oldWarehouseIDs: string[] = userRoleOld.warehouseIDs,
            newWarehouseIDs: string[] = userRoleNew.warehouseIDs;

        let warehouseIdsToInsert = newWarehouseIDs.filter(id => !oldWarehouseIDs.includes(id)),
            warehouseIdsToDelete = oldWarehouseIDs.filter(id => !newWarehouseIDs.includes(id));

        if (warehouseIdsToInsert.length > 0) {
            warehouseIdsToInsert.forEach((warehouseId: string) => {
                let warehouseOpPromise = admin.firestore().collection("warehouse").doc(warehouseId).get()
                    .then((warehouseSnap) => {
                        if (warehouseSnap.exists) {
                            let warehouse = warehouseSnap.data();
                            if (warehouse && warehouse.webshops) {
                                if (warehouse.webshops.length && warehouse.webshops.length > 0) {
                                    let warehouseWebshopPromise: Promise<any>[] = [];
                                    warehouse.webshops.forEach((webshopId: string) => {
                                        let insertOpPromise = admin.firestore().collection("webshop").doc(webshopId)
                                            .get()
                                            .then((webshopSnap) => {
                                                let promises: Promise<any>[] = [];
                                                if (webshopSnap.exists) {
                                                    let webshop: any = webshopSnap.data();
                                                    if (webshop && webshop.order_channel_id) {
                                                        let orderPromise = admin.firestore().collection("orders").where("order_channel_id", "==", webshop.order_channel_id).get()
                                                            .then((snapshot) => {
                                                                if (!snapshot.empty) {
                                                                    let writePromises: Promise<any>[] = [];
                                                                    snapshot.docs.forEach((orderSnap) => {
                                                                        //Add userId to each order document's ownerUserIds field
                                                                        let order = orderSnap.data();
                                                                        if (order.ownerUserIds && order.ownerUserIds.length > 0) {

                                                                            let writePromise = orderSnap.ref.set({
                                                                                ownerUserIds: firestore.FieldValue.arrayUnion(userId)
                                                                            },
                                                                                {
                                                                                    merge: true
                                                                                })
                                                                                .then((result) => {

                                                                                });
                                                                            writePromises.push(writePromise);
                                                                        } else {

                                                                            let writePromise = orderSnap.ref.set({
                                                                                ownerUserIds: [userId]
                                                                            },
                                                                                {
                                                                                    merge: true
                                                                                })
                                                                                .then((result) => {

                                                                                });
                                                                            writePromises.push(writePromise);
                                                                        }

                                                                    });
                                                                    return Promise.all(writePromises).then((result) => {
                                                                        functions.logger.log("Success adding ownerUserIds in order and product, warehouse's webshop");
                                                                    })
                                                                        .catch((err) => {
                                                                            functions.logger.log("Error adding ownerUserIds in order and product, warehouse's webshop", err);
                                                                        });
                                                                }
                                                                return Promise.resolve();
                                                            });
                                                        promises.push(orderPromise);

                                                        let productPromise = admin.firestore().collection("product")
                                                            .where("order_channel_id", "==", webshop.order_channel_id)
                                                            .get()
                                                            .then((snapshot) => {
                                                                if (!snapshot.empty) {
                                                                    let writePromises: Promise<any>[] = [];
                                                                    snapshot.docs.forEach((productSnap) => {
                                                                        if (productSnap.exists) {
                                                                            let product = productSnap.data();
                                                                            let writePromise: Promise<any>;
                                                                            if (product.ownerUserIds) {
                                                                                writePromise = productSnap.ref.set({
                                                                                    ownerUserIds: firestore.FieldValue.arrayUnion(userId)
                                                                                },
                                                                                    {
                                                                                        merge: true
                                                                                    })
                                                                                    .then((result) => {

                                                                                    });
                                                                            } else {
                                                                                writePromise = productSnap.ref.set({
                                                                                    ownerUserIds: [userId]
                                                                                },
                                                                                    {
                                                                                        merge: true
                                                                                    })
                                                                                    .then((result) => {

                                                                                    });
                                                                            }
                                                                            writePromises.push(writePromise);
                                                                        }

                                                                    });
                                                                }
                                                                return Promise.resolve();
                                                            });
                                                        promises.push(productPromise);

                                                        return Promise.all(promises).then((result) => {

                                                        }).catch((err) => {
                                                            functions.logger.log("Error writing ownerUserIds in orders and product for the warehouse", err);
                                                        });
                                                    }
                                                }
                                                return Promise.resolve();
                                            });
                                        warehouseWebshopPromise.push(insertOpPromise);

                                        //Add webshopId to userRole webshopIDs array
                                        let userRolesPromise = sanp.after.ref.set({
                                            webshopIDs: firestore.FieldValue.arrayUnion(webshopId)
                                        },
                                            {
                                                merge: true
                                            }).then((result) => {

                                            });
                                        warehouseWebshopPromise.push(userRolesPromise);
                                    });
                                    return Promise.all(warehouseWebshopPromise).then((result) => {
                                    }).catch((err) => {
                                        functions.logger.log("Error adding warehouse webshops orders & product ==> ownerUserIds", err);
                                    });
                                }
                            }
                        }
                        return Promise.resolve();
                    });
                promiseList.push(warehouseOpPromise);
            });
        }

        if (warehouseIdsToDelete.length > 0) {
            warehouseIdsToDelete.forEach((warehouseId: string) => {
                let warehouseOpPromise = admin.firestore().collection("warehouse").doc(warehouseId).get()
                    .then((warehouseSnap) => {
                        if (warehouseSnap.exists) {
                            let warehouse = warehouseSnap.data();
                            if (warehouse && warehouse.webshops) {
                                if (warehouse.webshops.length && warehouse.webshops.length > 0) {
                                    let warehouseWebshopPromise: Promise<any>[] = [];
                                    warehouse.webshops.forEach((webshopId: string) => {
                                        let deleteOpPromise = admin.firestore().collection("webshop").doc(webshopId)
                                            .get()
                                            .then((webshopSnap) => {
                                                let promises: Promise<any>[] = [];
                                                if (webshopSnap.exists) {
                                                    let webshop: any = webshopSnap.data();
                                                    if (webshop && webshop.order_channel_id) {
                                                        let ordersPromise = admin.firestore().collection("orders").where("order_channel_id", "==", webshop.order_channel_id).get()
                                                            .then((snapshot) => {
                                                                if (!snapshot.empty) {
                                                                    let writePromises: Promise<any>[] = [];
                                                                    snapshot.docs.forEach((orderSnap) => {
                                                                        //Remove userId from each order document's ownerUserIds field
                                                                        let order = orderSnap.data();
                                                                        if (order.ownerUserIds && order.ownerUserIds.length > 0) {

                                                                            let writePromise = orderSnap.ref.set({
                                                                                ownerUserIds: firestore.FieldValue.arrayRemove(userId)
                                                                            },
                                                                                {
                                                                                    merge: true
                                                                                })
                                                                                .then((result) => {

                                                                                });
                                                                            writePromises.push(writePromise);
                                                                        } else {

                                                                            let writePromise = orderSnap.ref.set({
                                                                                ownerUserIds: []
                                                                            },
                                                                                {
                                                                                    merge: true
                                                                                })
                                                                                .then((result) => {

                                                                                });
                                                                            writePromises.push(writePromise);
                                                                        }

                                                                    });
                                                                    return Promise.all(writePromises).then((result) => {
                                                                        functions.logger.log("Success removing ownerUserIds in order and product, warehouse's webshop");
                                                                    })
                                                                        .catch((err) => {
                                                                            functions.logger.log("Error removing ownerUserIds in order and product, warehouse's webshop", err);
                                                                        });
                                                                }
                                                                return Promise.resolve();
                                                            });
                                                        promises.push(ordersPromise);

                                                        let productPromise = admin.firestore().collection("product")
                                                            .where("order_channel_id", "==", webshop.order_channel_id)
                                                            .get()
                                                            .then((snapshot) => {
                                                                if (!snapshot.empty) {
                                                                    let writePromises: Promise<any>[] = [];
                                                                    snapshot.docs.forEach((productSnap) => {
                                                                        if (productSnap.exists) {
                                                                            let product = productSnap.data();
                                                                            let writePromise: Promise<any>;
                                                                            if (product.ownerUserIds) {
                                                                                writePromise = productSnap.ref.set({
                                                                                    ownerUserIds: firestore.FieldValue.arrayRemove(userId)
                                                                                },
                                                                                    {
                                                                                        merge: true
                                                                                    })
                                                                                    .then((result) => {

                                                                                    });
                                                                            } else {
                                                                                writePromise = productSnap.ref.set({
                                                                                    ownerUserIds: []
                                                                                },
                                                                                    {
                                                                                        merge: true
                                                                                    })
                                                                                    .then((result) => {

                                                                                    });
                                                                            }
                                                                            writePromises.push(writePromise);
                                                                        }

                                                                    });
                                                                }
                                                                return Promise.resolve();
                                                            });
                                                        promises.push(productPromise);

                                                        return Promise.all(promises).then((result) => {

                                                        }).catch((err) => {
                                                            functions.logger.log("Error writing ownerUserIds in orders and product for the warehouse", err);
                                                        });
                                                    }
                                                }
                                                return Promise.resolve();
                                            });
                                        warehouseWebshopPromise.push(deleteOpPromise);

                                        //Remove webshopId from userRole webshopIDs array
                                        let userRolesPromise = sanp.after.ref.set({
                                            webshopIDs: firestore.FieldValue.arrayRemove(webshopId)
                                        },
                                            {
                                                merge: true
                                            }).then((result) => {

                                            });
                                        warehouseWebshopPromise.push(userRolesPromise);
                                    });
                                    return Promise.all(warehouseWebshopPromise).then((result) => {
                                        functions.logger.log("Success removing warehouse webshops orders & product ==> ownerUserIds");
                                    }).catch((err) => {
                                        functions.logger.log("Error removing warehouse webshops orders & product ==> ownerUserIds", err);
                                    });
                                }
                            }
                        }
                        return Promise.resolve();
                    });
                promiseList.push(warehouseOpPromise);
            });;
        }

        return Promise.all(promiseList).then((result) => {
            functions.logger.log("OnUserRolesUpdate completed successfully");
        }).catch((err) => {
            functions.logger.log("OnUserRolesUpdate completed with errors", err);
        });
    });


exports.OnWebshopDelete = functions.firestore.document('webshop/{webshopId}')
    .onDelete((snap, context) => {
        const webshopID = snap.id;
        const webshop = snap.data();
        return admin.firestore().collection('userRoles')
            .where("webshopIDs", "array-contains", webshopID)
            .get()
            .then((userRolesSnap) => {
                let webshopDeletePromises: Promise<any>[] = [];

                if (!userRolesSnap.empty) {
                    userRolesSnap.docs.forEach((userRoleDocSnap) => {
                        const userRole = userRoleDocSnap.data();
                        const userId = userRole.uid;

                        /** Delete access fields from orders and product */
                        let orderPromise = admin.firestore().collection("orders").where("order_channel_id", "==", webshop.order_channel_id).get()
                            .then((snapshot) => {
                                if (!snapshot.empty) {
                                    let writePromises: Promise<any>[] = [];
                                    snapshot.docs.forEach((orderSnap) => {
                                        //Remove userId from each order document's ownerUserIds field
                                        let order = orderSnap.data();
                                        if (order.ownerUserIds && order.ownerUserIds.length > 0) {

                                            let writePromise = orderSnap.ref.set({
                                                ownerUserIds: firestore.FieldValue.arrayRemove(userId)
                                            },
                                                {
                                                    merge: true
                                                })
                                                .then((result) => {

                                                });
                                            writePromises.push(writePromise);
                                        } else {

                                            let writePromise = orderSnap.ref.set({
                                                ownerUserIds: []
                                            },
                                                {
                                                    merge: true
                                                })
                                                .then((result) => {

                                                });
                                            writePromises.push(writePromise);
                                        }

                                    });
                                    return Promise.all(writePromises).then((result) => {
                                        functions.logger.log("Success removing ownerUserIds in order and product, warehouse's webshop");
                                    })
                                        .catch((err) => {
                                            functions.logger.log("Error removing ownerUserIds in order and product, warehouse's webshop", err);
                                        });
                                }
                                return Promise.resolve();
                            });
                        webshopDeletePromises.push(orderPromise);

                        let productPromise = admin.firestore().collection("product")
                            .where("order_channel_id", "==", webshop.order_channel_id)
                            .get()
                            .then((snapshot) => {
                                if (!snapshot.empty) {
                                    let writePromises: Promise<any>[] = [];
                                    snapshot.docs.forEach((productSnap) => {
                                        if (productSnap.exists) {
                                            let product = productSnap.data();
                                            let writePromise: Promise<any>;
                                            if (product.ownerUserIds) {
                                                writePromise = productSnap.ref.set({
                                                    ownerUserIds: firestore.FieldValue.arrayRemove(userId)
                                                },
                                                    {
                                                        merge: true
                                                    })
                                                    .then((result) => {

                                                    });
                                            } else {
                                                writePromise = productSnap.ref.set({
                                                    ownerUserIds: []
                                                },
                                                    {
                                                        merge: true
                                                    })
                                                    .then((result) => {

                                                    });
                                            }
                                            writePromises.push(writePromise);
                                        }

                                    });
                                }
                                return Promise.resolve();
                            });
                        webshopDeletePromises.push(productPromise);
                        /** Delete access fields of previous order_channel_id from orders and product */
                    });
                }
                // Delete webshopId from userRoles
                let delWebshopIdPromise = admin.firestore().collection('userRoles')
                    .where("webshopIDs", "array-contains", webshopID)
                    .get()
                    .then((userRolesSnap) => {
                        let innerDelPromises: Promise<any>[] = [];
                        if (!userRolesSnap.empty) {
                            userRolesSnap.docs.forEach((userRoleDocSnap) => {
                                // Fire userRoles update trigger
                                let writePromise = userRoleDocSnap.ref.set({
                                    webshopIDs: firestore.FieldValue.arrayRemove(webshopID)
                                },
                                    {
                                        merge: true
                                    }).then((result) => {

                                    });
                                innerDelPromises.push(writePromise);
                            });
                        }
                        return Promise.all(innerDelPromises).then((result) => {

                        }).catch((err) => {
                            functions.logger.log("Error deleting webshopID from userRoles", err);
                        });
                    });
                webshopDeletePromises.push(delWebshopIdPromise);

                // Delete the webshop from it's warehouses
                let delWarehouseIdPromise = admin.firestore().collection("warehouse")
                    .where("webshops", "array-contains", webshopID)
                    .get()
                    .then((warehouseListSnap) => {
                        let innerDelPromises: Promise<any>[] = [];
                        if (!warehouseListSnap.empty) {
                            warehouseListSnap.docs.forEach((warehouseSnap) => {
                                if (warehouseSnap.exists) {
                                    let warehouse = warehouseSnap.data();
                                    if (warehouse.webshops && warehouse.webshops.length > 0) {
                                        let writePromise = warehouseSnap.ref.set({
                                            webshops: firestore.FieldValue.arrayRemove(webshopID)
                                        },
                                            {
                                                merge: true
                                            }).then((result) => {

                                            });
                                        innerDelPromises.push(writePromise);
                                    }

                                }
                            });
                        }
                        return Promise.all(innerDelPromises).then((result) => {

                        }).catch((err) => {
                            functions.logger.log("Error deleting warehouseID from userRoles", err);
                        });
                    });

                webshopDeletePromises.push(delWarehouseIdPromise);

                return Promise.all(webshopDeletePromises).then((result) => {

                }).catch((err) => {
                    functions.logger.log("Error occurred while deleting webshop", err);
                });
            });


    });

exports.OnWebshopUpdate = functions.firestore.document('webshop/{webshopId}')
    .onUpdate((snap, context) => {
        const webshopID = snap.before.id;
        const oldWebshopData = snap.before.data(),
            newWebshopData = snap.after.data();

        if (oldWebshopData.order_channel_id != newWebshopData.order_channel_id) {

            return admin.firestore().collection('userRoles')
                .where("webshopIDs", "array-contains", webshopID)
                .get()
                .then((userRolesSnap) => {
                    let webshopUpdatePromises: Promise<any>[] = [];
                    let triggerPromises: Promise<any>[] = [];

                    if (!userRolesSnap.empty) {
                        userRolesSnap.docs.forEach((userRoleDocSnap) => {
                            const userRole = userRoleDocSnap.data();
                            const userId = userRole.uid;

                            /** Delete access fields of previous order_channel_id from orders and product */
                            let orderPromise = admin.firestore().collection("orders").where("order_channel_id", "==", oldWebshopData.order_channel_id).get()
                                .then((snapshot) => {
                                    if (!snapshot.empty) {
                                        let writePromises: Promise<any>[] = [];
                                        snapshot.docs.forEach((orderSnap) => {
                                            //Remove userId from each order document's ownerUserIds field
                                            let order = orderSnap.data();
                                            if (order.ownerUserIds && order.ownerUserIds.length > 0) {

                                                let writePromise = orderSnap.ref.set({
                                                    ownerUserIds: firestore.FieldValue.arrayRemove(userId)
                                                },
                                                    {
                                                        merge: true
                                                    })
                                                    .then((result) => {

                                                    });
                                                writePromises.push(writePromise);
                                            } else {

                                                let writePromise = orderSnap.ref.set({
                                                    ownerUserIds: []
                                                },
                                                    {
                                                        merge: true
                                                    })
                                                    .then((result) => {

                                                    });
                                                writePromises.push(writePromise);
                                            }

                                        });
                                        return Promise.all(writePromises).then((result) => {
                                            functions.logger.log("Success removing ownerUserIds in order and product, warehouse's webshop");
                                        })
                                            .catch((err) => {
                                                functions.logger.log("Error removing ownerUserIds in order and product, warehouse's webshop", err);
                                            });
                                    }
                                    return Promise.resolve();
                                });
                            webshopUpdatePromises.push(orderPromise);

                            let productPromise = admin.firestore().collection("product")
                                .where("order_channel_id", "==", oldWebshopData.order_channel_id)
                                .get()
                                .then((snapshot) => {
                                    if (!snapshot.empty) {
                                        let writePromises: Promise<any>[] = [];
                                        snapshot.docs.forEach((productSnap) => {
                                            if (productSnap.exists) {
                                                let product = productSnap.data();
                                                let writePromise: Promise<any>;
                                                if (product.ownerUserIds) {
                                                    writePromise = productSnap.ref.set({
                                                        ownerUserIds: firestore.FieldValue.arrayRemove(userId)
                                                    },
                                                        {
                                                            merge: true
                                                        })
                                                        .then((result) => {

                                                        });
                                                } else {
                                                    writePromise = productSnap.ref.set({
                                                        ownerUserIds: []
                                                    },
                                                        {
                                                            merge: true
                                                        })
                                                        .then((result) => {

                                                        });
                                                }
                                                writePromises.push(writePromise);
                                            }

                                        });
                                    }
                                    return Promise.resolve();
                                });
                            webshopUpdatePromises.push(productPromise);
                            /** Delete access fields of previous order_channel_id from orders and product */

                            // Fire userRoles update trigger
                            let triggerPromise = userRoleDocSnap.ref.set({
                                webshopIDs: firestore.FieldValue.arrayRemove(webshopID)
                            },
                                {
                                    merge: true
                                })
                                .then((result) => {
                                    return userRoleDocSnap.ref.set({
                                        webshopIDs: firestore.FieldValue.arrayUnion(webshopID)
                                    },
                                        {
                                            merge: true
                                        }).then((result) => {

                                        });
                                });

                            triggerPromises.push(triggerPromise);
                        });
                    }

                    return Promise.all(webshopUpdatePromises).then((result) => {
                        return Promise.all(triggerPromises).then((result) => {

                        });
                    }).catch((err) => {
                        functions.logger.log("Error updating webshop", err);
                    });
                });
        }
        return Promise.resolve();
    });

exports.OnWarehouseDelete = functions.firestore.document("warehouse/{warehouseId}")
    .onDelete((snap, context) => {
        const warehouseId = snap.id;
        const warehouse = snap.data();

        return admin.firestore().collection('userRoles')
            .where("warehouseIDs", "array-contains", warehouseId)
            .get()
            .then((userRolesSnap) => {
                let promises: Promise<any>[] = [];
                if (!userRolesSnap.empty) {
                    userRolesSnap.docs.forEach((userRoleDocSnap) => {
                        // Fire userRoles update trigger
                        let triggerPromise = userRoleDocSnap.ref.set({
                            warehouseIDs: firestore.FieldValue.arrayRemove(warehouseId)
                        },
                            {
                                merge: true
                            }).then((result) => {

                            });
                        promises.push(triggerPromise);

                        // Delete webshopIDs from userRoles of the deleted warehouse webshop ids
                        if (warehouse.webshops && warehouse.webshops.length && warehouse.webshops.length > 0) {
                            warehouse.webshops.forEach((webshopId: string) => {
                                let writePromise = userRoleDocSnap.ref.set({
                                    webshopIDs: firestore.FieldValue.arrayRemove(webshopId)
                                },
                                    {
                                        merge: true
                                    }).then((result) => {

                                    });
                                promises.push(writePromise);
                            });
                        }
                    });
                }
                return Promise.all(promises).then((result) => {

                }).catch((err) => {
                    functions.logger.log("Error deleting warehouse", err);
                });
            });
    });

exports.OnWarehouseUpdate = functions.firestore.document("warehouse/{warehouseId}")
    .onUpdate((snap, context) => {
        const warehouseId = snap.before.id;
        const oldWarehouseData = snap.before.data(),
            newWarehouseData = snap.after.data();

        const insertedWebshopIds = newWarehouseData.webshops.filter((id: string) => !oldWarehouseData.webshops.includes(id)),
            removedWebshopIds = oldWarehouseData.webshops.filter((id: string) => !newWarehouseData.webshops.includes(id));

        let warehouseUpdatePromises: Promise<any>[] = [];

        if (insertedWebshopIds.length > 0 || removedWebshopIds.length > 0) {
            insertedWebshopIds.forEach((webshopId: string) => {
                let insertOpPromise = admin.firestore().collection('userRoles')
                    .where("warehouseIDs", "array-contains", warehouseId)
                    .get()
                    .then((userRolesSnap) => {
                        let innerPromises: Promise<any>[] = [];
                        if (!userRolesSnap.empty) {
                            userRolesSnap.docs.forEach((userRoleDocSnap) => {
                                // Fire userRoles update trigger
                                let triggerPromise = userRoleDocSnap.ref.set({
                                    webshopIDs: firestore.FieldValue.arrayUnion(webshopId)
                                },
                                    {
                                        merge: true
                                    }).then((result) => {

                                    });
                                innerPromises.push(triggerPromise);
                            });
                        }

                        return Promise.all(innerPromises).then((result) => {

                        }).catch((err) => {
                            functions.logger.log("Error adding webshop to userRoles on warehouse update", err);
                        });
                    });
                warehouseUpdatePromises.push(insertOpPromise);
            });

            removedWebshopIds.forEach((webshopId: string) => {
                let deleteOpPromise = admin.firestore().collection('userRoles')
                    .where("warehouseIDs", "array-contains", warehouseId)
                    .get()
                    .then((userRolesSnap) => {
                        let innerPromises: Promise<any>[] = [];
                        if (!userRolesSnap.empty) {
                            userRolesSnap.docs.forEach((userRoleDocSnap) => {
                                // Fire userRoles update trigger
                                let triggerPromise = userRoleDocSnap.ref.set({
                                    webshopIDs: firestore.FieldValue.arrayRemove(webshopId)
                                },
                                    {
                                        merge: true
                                    }).then((result) => {

                                    });
                                innerPromises.push(triggerPromise);
                            });
                        }

                        return Promise.all(innerPromises).then((result) => {

                        }).catch((err) => {
                            functions.logger.log("Error removing webshop from userRoles on warehouse update", err);
                        });
                    });
                warehouseUpdatePromises.push(deleteOpPromise);
            });

            return Promise.all(warehouseUpdatePromises).then((result) => {

            }).catch((err) => {
                functions.logger.log("Error updating warehouse", err);
            });
        }
        return Promise.resolve();
    });

exports.OnOrderCreateAddOwnerUserIds = functions.firestore.document("orders/{orderId}")
    .onCreate((ordersnap, context) => {
        const order = ordersnap.data();
        if (order && order.order_channel_id) {
            //get webshop/s of the order by order_channel_id 
            return admin.firestore().collection("webshop")
                .where("order_channel_id", "==", order.order_channel_id)
                .get()
                .then((webshopSnaps) => {
                    let promises: Promise<any>[] = [];

                    if (!webshopSnaps.empty) {
                        webshopSnaps.docs.forEach((webshopDocSnap) => {
                            if (webshopDocSnap.exists) {
                                // get all userId of the webshop and add to orders doc's ownerUserIds
                                const webshopID = webshopDocSnap.id;
                                let userRolesPromise = admin.firestore().collection('userRoles')
                                    .where("webshopIDs", "array-contains", webshopID)
                                    .get()
                                    .then((userRolesSnap) => {
                                        let innerPromises: Promise<any>[] = [];
                                        if (!userRolesSnap.empty) {
                                            userRolesSnap.docs.forEach((userRoleDocSnap) => {
                                                const userId = userRoleDocSnap.id;
                                                let writePromise = ordersnap.ref.set({
                                                    ownerUserIds: firestore.FieldValue.arrayUnion(userId)
                                                },
                                                    {
                                                        merge: true
                                                    }).then((result) => {

                                                    });
                                                innerPromises.push(writePromise);
                                            });
                                        }

                                        return Promise.all(innerPromises).then((result) => {

                                        }).catch((err) => {
                                            functions.logger.log("Error adding ownerUserId on order create", err);
                                        });

                                    });
                                promises.push(userRolesPromise);

                                //update order count of the webshop
                                const webshop = webshopDocSnap.data();
                                let webshopPromise: Promise<any>;
                                if (webshop.ordersCount) {
                                    webshopPromise = webshopDocSnap.ref.set({
                                        ordersCount: webshop.ordersCount + 1
                                    },
                                        {
                                            merge: true
                                        }).then((result) => {

                                        });
                                } else {
                                    webshopPromise = webshopDocSnap.ref.set({
                                        ordersCount: 1
                                    },
                                        {
                                            merge: true
                                        }).then((result) => {

                                        });
                                }
                                promises.push(webshopPromise);
                            }
                        });
                    }

                    return Promise.all(promises).then((result) => {

                    }).catch((err) => {
                        functions.logger.log("Error adding ownerUserIds on order create", err);
                    })
                });
        }
        return Promise.resolve();
    });

exports.OnOrderCreateIncreaseCounter = functions.firestore.document("orders/{orderId}")
    .onCreate((ordersnap, context) => {
        //update total orders
        return admin.firestore().collection("ordersCounter").doc("ORDERSCOUNTER")
            .get()
            .then((ordersCountSnap) => {
                if (ordersCountSnap.exists) {
                    let counterObj = ordersCountSnap.data();
                    if (counterObj) {
                        let total: number = counterObj.totalOrders ? counterObj.totalOrders : 0;
                        ordersCountSnap.ref.set({
                            totalOrders: total + 1,
                            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                        },
                            {
                                merge: true
                            }).then((result) => {

                            });
                    }
                }
            }).catch((err) => {
                functions.logger.log("Error incrementing orders counter in OnOrderCreateIncreaseCounter", err);
            });
    });

exports.OnOrderDelete = functions.firestore.document("orders/{orderId}")
    .onDelete((ordersnap, context) => {
        const order = ordersnap.data();
        let promises: Promise<any>[] = [];

        if (order && order.order_channel_id) {
            let webshopPromise = admin.firestore().collection("webshop")
                .where("order_channel_id", "==", order.order_channel_id)
                .get()
                .then((webshopSnaps) => {
                    let innerPromises: Promise<any>[] = [];
                    if (!webshopSnaps.empty) {
                        webshopSnaps.docs.forEach((webshopDocSnap) => {
                            const webshop = webshopDocSnap.data();
                            if (webshop.ordersCount && webshop.ordersCount > 0) {
                                let writePromise = webshopDocSnap.ref.set({
                                    ordersCount: webshop.ordersCount - 1
                                },
                                    {
                                        merge: true
                                    }).then((result) => {

                                    });
                                innerPromises.push(writePromise);
                            }
                        });

                    }

                    return Promise.all(innerPromises).then((result) => {

                    }).catch((err) => {
                        functions.logger.log("Error updating webshop ordersCount on order delete");
                    });
                });
            promises.push(webshopPromise);
        }

        let ordersCounterPromise = admin.firestore().collection("ordersCounter").doc("ORDERSCOUNTER")
            .get()
            .then((ordersCountSnap) => {
                if (ordersCountSnap.exists) {
                    let counterObj = ordersCountSnap.data();
                    if (counterObj) {
                        let total: number = (counterObj.totalOrders > 0) ? counterObj.totalOrders : 1;
                        return ordersCountSnap.ref.set({
                            totalOrders: total - 1,
                            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                        },
                            {
                                merge: true
                            }).then((result) => {

                            });
                    }
                }
                return Promise.resolve();
            });

        promises.push(ordersCounterPromise);

        return Promise.all(promises).then((result) => {

        }).catch((err) => {
            functions.logger.log("Error updating ordersCounter, webshop ordersCount on order delete");
        });
    });

exports.OnWebshopCreate = functions.firestore.document('webshop/{webshopId}')
    .onCreate((snap, context) => {
        const webshop = snap.data();
        if (webshop && webshop.order_channel_id) {
            return admin.firestore().collection("orders").where("order_channel_id", "==", webshop.order_channel_id).get()
                .then((ordersSnaps) => {
                    if (!ordersSnaps.empty) {
                        const totalOrders = ordersSnaps.docs.length;
                        return snap.ref.set({
                            ordersCount: totalOrders
                        },
                            {
                                merge: true
                            }).then((result) => {

                            });
                    }
                    return Promise.resolve();
                });
        }
        return Promise.resolve();
    });

exports.OnWebshopUpdateSetOrdersCount = functions.firestore.document('webshop/{webshopId}')
    .onUpdate((snap, context) => {
        const oldWebshopData = snap.before.data(),
            newWebshopData = snap.after.data();

        if (oldWebshopData.order_channel_id != newWebshopData.order_channel_id) {
            //Update webshop ordersCount
            return admin.firestore().collection("orders").where("order_channel_id", "==", newWebshopData.order_channel_id).get()
                .then((ordersSnaps) => {
                    if (!ordersSnaps.empty) {
                        const totalOrders = ordersSnaps.docs.length;
                        return snap.after.ref.set({
                            ordersCount: totalOrders
                        },
                            {
                                merge: true
                            }).then((result) => {

                            });
                    }
                    else {
                        return snap.after.ref.set({
                            ordersCount: 0
                        },
                            {
                                merge: true
                            }).then((result) => {

                            });
                    }
                });
        }
        return Promise.resolve();
    });

exports.createOrder = functions.https.onCall((data, context) => {
    const uid = context.auth?.uid;
    const order = data?.order;
    const webshopId = data?.webshopId;

    if (uid && order && webshopId && order.order_channel_id) {
        admin.firestore().doc("userRoles/" + uid)
            .get()
            .then((docSnapshot) => {
                if (docSnapshot.exists) {
                    const userRole: any = docSnapshot.data();
                    if(userRole.webshopIDs) {
                        const isUserWebshop: boolean = userRole.webshopIDs.includes(webshopId);
                        if(isUserWebshop) {
                            //cross checking order_channel_id and webshopId
                            admin.firestore().doc("webshop/" + webshopId)
                                .get().then((docSnap) => {
                                    if(docSnap.exists) {
                                        const webshop = docSnap.data();
                                        if(webshop && webshop.order_channel_id === order.order_channel_id) {
                                            admin.firestore().collection("orders")
                                                .add(order).then((docRef) => {
                                                    docRef.set({
                                                        uniqueId: docRef.id
                                                    }, {
                                                        merge: true
                                                    }).then((result) => {
                                                        return docRef.id;
                                                    });
                                                    
                                                });
                                        }
                                    }
                                });
                            
                        }
                    }
                }
            })
    }

    return null;
});