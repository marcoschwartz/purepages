Meteor.methods({

    flushCache: function() {

        // Flush
        console.log('Flushing cache');
        Caches.update({}, { $set: { cached: false } }, { multi: true });
        Pages.update({}, { $set: { cached: false } }, { multi: true });


    },
    // returnHeader: function() {

    //     if (Meteor.settings.useCache == true) {

    //         if (Caches.findOne({ element: 'header' })) {

    //             // Check status of cache
    //             var headerCache = Caches.findOne({ element: 'header' });

    //             if (headerCache.cached == true) {

    //                 console.log('Returning cached header');
    //                 return headerCache.html;
    //             } else {

    //                 // Render
    //                 console.log('Updating header cache');
    //                 html = Meteor.call('renderHeader');

    //                 // Update cache
    //                 Caches.update({ element: 'header' }, { $set: { html: html, cached: true } });

    //                 return html;

    //             }

    //         } else {

    //             // Render
    //             console.log('Creating header cache');
    //             html = Meteor.call('renderHeader');

    //             // Create cache
    //             Caches.insert({ element: 'header', html: html, cached: true });

    //             return html;

    //         }

    //     } else {
    //         console.log('Rendering header without caching');
    //         return Meteor.call('renderHeader');
    //     }

    // },
    renderHeader: function(options) {

        // Compile header
        SSR.compileTemplate('header', Assets.getText('header_template.html'));

        // Helpers
        Template.header.helpers({

            favicon: function() {
                var brand = Brands.findOne(options.brandId);
                if (brand.logo) {
                    return Images.findOne(brand.logo).link();
                }
            },
            pageName: function() {
                var brand = Brands.findOne(options.brandId);
                return brand.name;
            },
            useTracking: function() {
                var brand = Brands.findOne(options.brandId);
                if (brand.trackingId) {
                    if (brand.trackingId != "") {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            },
            trackingId: function() {
                var brand = Brands.findOne(options.brandId);
                if (brand.trackingId) {
                    return brand.trackingId;
                }
            }

        });

        // Load css
        var css = Assets.getText('style.css');
        css += Assets.getText('sales_page.css');
        css += Assets.getText('tripwire_page.css');

        console.log('Rendering header');

        if (options.lead) {
            var trackLead = options.lead;
        } else {
            var trackLead = false;
        }

        // Get Facebook pixel
        var pixel = Meteor.call('getFacebookPixel');

        var headerHtml = SSR.render('header', { pixelId: pixel, css: css, trackLead: trackLead });
        // console.log(headerHtml);

        return headerHtml;

    },
    renderPage: function(postUrl, query) {

        // Find post or page
        if (Pages.findOne({ url: postUrl })) {

            // Query
            var page = Pages.findOne({ url: postUrl });

            // Check if cached
            if (page.cached == true && !(query.ref) && !(query.origin) && !(query.subscriber) && !(query.discount)) {

                // Get render
                console.log('Page cached, returning cached version');

                if (page.model == 'thankyou' || page.model == 'tripwire') {

                    // Render header
                    headerHtml = Meteor.call('renderHeader', { brandId: page.brandId, lead: true });
                }
                if (page.model == 'salespage' || page.model == 'leadgen' || page.model == 'closed') {

                    // Render header
                    headerHtml = Meteor.call('renderHeader', { brandId: page.brandId });
                }

                return headerHtml + "<body>" + "<div class='container-fluid main-container'>" + page.html + "</div>" + "</body>";

            } else {

                console.log('Page not cached, rendering');

                // Get URL
                var absoluteURL = Meteor.absoluteUrl();

                if (page.model == 'leadgen') {

                    // Get brand
                    var brand = Brands.findOne(page.brandId);

                    // console.log(page);

                    // Render header
                    headerHtml = Meteor.call('renderHeader', { brandId: page.brandId });

                    // Compile
                    SSR.compileTemplate('pageTemplate',
                        Assets.getText('lead_page_template.html'));

                    // Helpers
                    Template.pageTemplate.helpers({
                        imageLink: function() {
                            if (page.message.image) {
                                return Images.findOne(page.message.image).link();
                            }
                        },
                        origin: function() {
                            if (query.origin) {
                                return query.origin;
                            } else {
                                return 'landing';
                            }
                        },
                        meteorURL: function() {
                            return absoluteURL;
                        },
                        brandPicture: function() {

                            var brand = Brands.findOne(page.brandId);
                            return Images.findOne(brand.image).link();
                        },
                        elements: function() {
                            return Elements.find({ pageId: page._id });
                        },
                        listId: function() {
                            return brand.listId;
                        },
                        sequenceId: function() {
                            return this.sequenceId;
                        },
                        langEN: function() {
                            var brand = Brands.findOne(this.brandId);

                            if (brand.language) {
                                if (brand.language == 'fr') {
                                    return false;
                                } else {
                                    return true;
                                }
                            } else {
                                return true;
                            }
                        }

                    });

                }

                if (page.model == 'tripwire') {

                    // Render header
                    headerHtml = Meteor.call('renderHeader', { brandId: page.brandId, lead: true });

                    // Get product data
                    var productData = Meteor.call('getProductData', page._id);

                    // Get brand data
                    var brand = Brands.findOne(page.brandId);
                    var brandLanguage = Meteor.call('getBrandLanguage', page.brandId);

                    // Compile
                    SSR.compileTemplate('pageTemplate',
                        Assets.getText('tripwire_template.html'));

                    // Helpers
                    Template.pageTemplate.helpers({
                        mainImageLink: function() {
                            if (page.main.image) {
                                return Images.findOne(page.main.image).link();
                            }
                        },
                        messageImageLink: function() {
                            if (page.message.image) {
                                return Images.findOne(page.message.image).link();
                            }
                        },
                        brandPicture: function() {

                            var brand = Brands.findOne(page.brandId);
                            return Images.findOne(brand.image).link();
                        },
                        elements: function(type) {
                            return Elements.find({ pageId: page._id, type: type });
                        },
                        checkoutLink: function() {

                            return 'https://' + Integrations.findOne(brand.cartId).url + '?product_id=' + productData._id;

                        },
                        salesPrice: function() {
                            if (brandLanguage == 'en') {
                                return '$' + (productData.price.USD).toFixed(2);
                            } else {
                                return (productData.price.EUR).toFixed(2) + ' €';
                            }
                        },
                        langEN: function() {
                            var brand = Brands.findOne(this.brandId);

                            if (brand.language) {
                                if (brand.language == 'fr') {
                                    return false;
                                } else {
                                    return true;
                                }
                            } else {
                                return true;
                            }
                        }

                    });

                }

                if (page.model == 'thankyou') {

                    // Render header
                    headerHtml = Meteor.call('renderHeader', { brandId: page.brandId, lead: true });

                    // Compile
                    SSR.compileTemplate('pageTemplate',
                        Assets.getText('thanks_page_template.html'));

                    // Helpers
                    Template.pageTemplate.helpers({
                        brandPicture: function() {

                            var brand = Brands.findOne(page.brandId);
                            return Images.findOne(brand.image).link();
                        }
                    });

                }

                if (page.model == 'closed') {

                    // Render header
                    headerHtml = Meteor.call('renderHeader', { brandId: page.brandId });

                    // Compile
                    SSR.compileTemplate('pageTemplate',
                        Assets.getText('course_closed_template.html'));

                    // Helpers
                    Template.pageTemplate.helpers({
                        brandPicture: function() {

                            var brand = Brands.findOne(page.brandId);
                            return Images.findOne(brand.image).link();
                        }
                    });

                }

                if (page.model == 'salespage') {

                    // Render header
                    headerHtml = Meteor.call('renderHeader', { brandId: page.brandId });

                    // Check if timer is expired
                    var timerExpired = false;
                    if (page.timer) {

                        // Timer active by default
                        var useTimer = true;

                        if (page.timer.active == 'yes') {

                            // Check if it's linked to a subscriber
                            if (query.subscriber) {

                                // Get offers
                                offers = Meteor.call('getOffers', query.subscriber);
                                console.log(offers);

                                // Check if offer match product
                                var offerFound = false;
                                for (o in offers) {
                                    if (offers[o].productId == page.productId) {
                                        console.log('Offer found');
                                        offerFound = true;
                                        var offer = offers[o];
                                    }
                                }

                                if (offerFound) {

                                    // Date
                                    var currentDate = new Date();
                                    var expiryDate = new Date(offer.expiryDate);

                                    if (currentDate.getTime() - expiryDate.getTime() > 0) {
                                        timerExpired = true;
                                    }

                                } else {
                                    // Date
                                    var currentDate = new Date();
                                    var expiryDate = new Date(page.timer.date);

                                    if (currentDate.getTime() - expiryDate.getTime() > 0) {
                                        timerExpired = true;
                                    }
                                }

                            } else if (query.discount) {

                                // Verify discount
                                discount = Meteor.call('getDiscount', query.discount, page.brandId);

                                if (discount._id) {
                                    console.log('Valid discount code')
                                    timerExpired = false;
                                    useTimer = false;
                                } else {

                                    console.log('Invalid discount code')

                                    // Date
                                    var currentDate = new Date();
                                    var expiryDate = new Date(page.timer.date);

                                    if (currentDate.getTime() - expiryDate.getTime() > 0) {
                                        timerExpired = true;
                                    }
                                }

                            } else {

                                // Date
                                var currentDate = new Date();
                                var expiryDate = new Date(page.timer.date);

                                if (currentDate.getTime() - expiryDate.getTime() > 0) {
                                    timerExpired = true;
                                }
                            }

                        } else {
                            useTimer = false;
                        }
                    }

                    // Act according to timer
                    if (timerExpired == true) {

                        console.log('Timer expired');

                        // Reload page
                        var page = Pages.findOne(page.timer.page);

                        // Compile
                        SSR.compileTemplate('pageTemplate',
                            Assets.getText('course_closed_template.html'));

                    } else {
                        // Compile
                        SSR.compileTemplate('pageTemplate',
                            Assets.getText('sales_page_template.html'));

                        // Get product data
                        var productData = Meteor.call('getProductData', page._id);

                    }

                    // Get brand data
                    var brand = Brands.findOne(page.brandId);
                    var brandLanguage = Meteor.call('getBrandLanguage', page.brandId);

                    // If offer, create discount
                    if (offerFound) {
                        if (parseInt(offer.offerDiscount) != 0) {

                            // Generate code
                            var discountCode = "";
                            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

                            for (var i = 0; i < 7; i++) {
                                discountCode += possible.charAt(Math.floor(Math.random() * possible.length));
                            }

                            discountData = {
                                code: discountCode,
                                name: 'Offer Discount',
                                amount: offer.offerDiscount,
                                type: 'percent'
                            }

                            // Create discount
                            Meteor.call('createDiscount', discountData, brand.cartId);

                        }
                    }

                    // Helpers
                    Template.pageTemplate.helpers({

                        checkoutLink: function() {

                            var link = 'https://' + Integrations.findOne(brand.cartId).url + '?product_id=' + productData._id;

                            if (offer) {
                                link += '&discount=' + discountCode;
                            }

                            else if (typeof discount !== 'undefined') {
                                link += '&discount=' + discount.code;
                            }

                            return link;

                        },
                        isDiscounted: function() {
                            if (offer) {
                                if (parseInt(offer.offerDiscount) == 0) {
                                    return false;
                                } else {
                                    return true;
                                }
                            } else if (typeof discount !== 'undefined') {
                                return true;
                            } else {
                                return false;
                            }
                        },
                        meteorURL: function() {
                            return absoluteURL;
                        },
                        timerActive: function() {
                            if (useTimer) {
                                return true;
                            } else {
                                return false;
                            }
                        },
                        timerEnd: function() {
                            return expiryDate;
                        },
                        isAffiliateLink: function() {
                            if (query.ref) {
                                return true;
                            } else {
                                return false;
                            }
                        },
                        affiliateLink: function() {
                            if (query.ref) {
                                return '&ref=' + query.ref;
                            } else {
                                return '';
                            }
                        },
                        salesPrice: function() {
                            if (brandLanguage == 'en') {
                                var price = parseFloat(productData.price.USD);
                                if (offer) {
                                    price = price * (1 - parseInt(offer.offerDiscount) / 100);
                                }
                                else if (typeof discount !== 'undefined') {
                                    price = price * (1 - parseInt(discount.amount) / 100);
                                }
                                return '$' + price.toFixed(2);
                            } else {
                                var price = parseFloat(productData.price.EUR);
                                if (offer) {
                                    price = price * (1 - parseInt(offer.offerDiscount) / 100);
                                } else if (typeof discount !== 'undefined') {
                                    price = price * (1 - parseInt(discount.amount) / 100);
                                }
                                return price.toFixed(2) + ' €';
                            }
                        },
                        baseSalesPrice: function() {
                            if (brandLanguage == 'en') {
                                var price = parseFloat(productData.price.USD);
                                return '$' + price.toFixed(2);
                            } else {
                                var price = parseFloat(productData.price.EUR);
                                return price.toFixed(2) + ' €';
                            }
                        },
                        productName: function() {
                            return productData.name;
                        },
                        salesImage: function() {

                            return 'background-image: url(' + Images.findOne(page.payment.image).link() + ')';

                        },
                        headerImage: function() {

                            return 'background-image: url(' + Images.findOne(page.header.image).link() + ')';

                        },
                        greenTheme: function() {

                            if (page.theme) {
                                if (page.theme == 'green') {
                                    return 'background-color: #389839;';
                                }
                            }

                        },
                        langEN: function() {
                            var brand = Brands.findOne(this.brandId);

                            if (brand.language) {
                                if (brand.language == 'fr') {
                                    return false;
                                } else {
                                    return true;
                                }
                            } else {
                                return true;
                            }
                        },
                        brandPicture: function() {

                            var brand = Brands.findOne(this.brandId);
                            return Images.findOne(brand.image).link();
                        },
                        includedElements: function() {
                            return Elements.find({ type: 'included', pageId: this._id }, { sort: { number: 1 } });
                        },
                        benefitElements: function() {
                            return Elements.find({ type: 'benefit', pageId: this._id }, { sort: { number: 1 } });
                        },
                        moduleElements: function() {
                            return Elements.find({ type: 'module', pageId: this._id }, { sort: { number: 1 } });
                        },
                        bonusElements: function() {
                            return Elements.find({ type: 'bonus', pageId: this._id }, { sort: { number: 1 } });
                        },
                        areBonuses: function() {

                            if (this.bonuses) {
                                if (this.bonuses.title == '') {
                                    return false;
                                } else {
                                    return true;
                                }
                            } else {
                                return false;
                            }

                        },
                        faqElements: function() {
                            return Elements.find({ type: 'faq', pageId: this._id }, { sort: { number: 1 } });
                        },
                        whoElements: function() {
                            return Elements.find({ type: 'who', pageId: this._id }, { sort: { number: 1 } });
                        },
                        paymentElements: function() {
                            return Elements.find({ type: 'payment', pageId: this._id }, { sort: { number: 1 } });
                        },
                        moduleImage: function(module) {
                            var page = Pages.findOne(module.pageId);
                            return Images.findOne(page.modules.image).link();
                        }

                    });

                }

                // Render
                var html = SSR.render('pageTemplate', page);

                // Save if no affiliate code
                if (!(query.ref) && !(query.origin) && !(query.subscriber) && !(query.discount)) {
                    console.log('Caching page');
                    Pages.update({ url: postUrl }, { $set: { cached: true, html: html } })
                } else {
                    console.log('Saving html');
                    Pages.update({ url: postUrl }, { $set: { cached: false, html: html } })
                }

                return headerHtml + "<body>" + "<div class='container-fluid main-container'>" + html + "</div>" + "</body>";

            }

        } else {

            // Render header
            headerHtml = Meteor.call('renderHeader', {});

            return headerHtml + "<body>" + "</body>";
        }

    }

});
