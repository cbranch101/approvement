detailsHandler = {
	isPreviewShown : function() {
		var isPreviewShown = false;
		if(contentTypeBuilder.isType('link')) {
			
			// if this is an item that existed before links were required, 
			// show the preview by default
			// otherwise, require that a link be entered before showing the preview
			if(facebookHandler.isLegacyLink()) {
				return true;
			} else {
				isPreviewShown = facebookHandler.linkEntered();
			}
			
		} else {
			isPreviewShown = contentTypeBuilder.isContentTypeChosen();
		}
		if(!customClientHandler.allowPreviewToShow()) {
			isPreviewShown = false;
		}
		return isPreviewShown;
	},
	getHeaderTitle : function(item) {
		return this.getTitleString("Create New ", "Edit ");
	},
	getTitleString : function(createPrefix, editPrefix){
		var dayDescription =  timeHandler.getDayDescription();
		var typeName = networkTypeBuilder.getTypeName();
		var prefix = this.creatingNewItem() ? createPrefix : editPrefix;
		return prefix + typeName + " for " + dayDescription;
	},
	onEditRouteLoad : function(params) {
		var creatingNew = false;
		var context = Session.get('approval_item_context') ? Session.get('approval_item_context') : {_id : params.id};
		var windowParams = {
			is_creating_new : creatingNew,
			context : context,
		};
		settingsWindowHandler.show('approval_item_details', windowParams);
	},
	onCreateRouteLoad : function(params) {
		var context = Session.get('approval_item_context');
		if(context == null) {
			navHandler.go('content_calendar', {client_id : params.client, week_id : params.week});
		} else {
			var routeParams = {
				is_creating_new : true,
				context : context,
			};
			settingsWindowHandler.show('approval_item_details', routeParams);
		}
	},
	getEnterPressState : function() {
		if(!userHandler.userIsType('art_director')) {
			return Session.get('current_scope') == 'private' ? 'edited' : 'updated';
		} else {
			return 'creative_updated';
		}
	},
	imageIsLoading : function() {
		return Session.get('image_is_loading');	
	},
	onEnterPress : function() {
		if(this.isPreviewShown()) {
			var enterPressState = detailsHandler.getEnterPressState();
			stateManager.changeToState(enterPressState);
		}
	},
	showDropdowns : function() {
		if(contentTypeBuilder.isType('link')) {
			// if the custom dropdown is required, make sure the value is set before hiding the dropdowns
			if(customClientHandler.customDropdownsAreRequired()) {
				
				return !customClientHandler.allCustomDropdownValuesSelected();
			} else {
				return false;
			}
		} else {
			return !this.isPreviewShown() && this.creatingNewItem();
		}
	},
	detailsShown : function(){
		return settingsWindowHandler.typeIsShown('approval_item_details');
	},
	creatingNewItem : function() {
		return Session.get('creating_new_item');
	},
	onShowDetails : function(context, creatingNewItem) {
		context = this.fillInMissingContextData(context);
		this.closeShownPopup();
		this.setDefaultsOnShow(context, creatingNewItem);
		if(!creatingNewItem) {
			this.configureDetailsForExistingItem(context);
		} else {
			this.handleCopiedAssets();
		}
	},
	handleCopiedAssets : function() { 
		if(Session.get('item_to_copy')) {
			var itemToCopy = Session.get('item_to_copy');
			Meteor.call('copyAllAssetsFromApprovalItem', itemToCopy['_id'], Session.get('current_item_id'));
		}	
	},
	fillInMissingContextData : function(context) {
		// if we're coming from a route, where we don't have access to the context
		// we need to fill in data
		if(!_.has(context, 'type')) {
			var calendarDays = Session.get('calendar_days');
			_.map(calendarDays, function(calendarDay){
				if(_.has(calendarDay, 'approval_items')) {
					var approvalItems = [];
					var allApprovalItems = calendarDay['approval_items'];
					var approvalItems = _.flatten(calendarDay['approval_items']);
					foundItem = _.find(approvalItems, function(item){
						return item['_id'] == context['_id'];
					});
					if(foundItem) {
						context = foundItem;
					}
				}
			});
		}
		return context;	
	},
	
	getPreviewContent : function() {
		return {
			clickable_inputs : Session.get('clickable_inputs'),
			preview_template : Session.get('current_network_type') + 'Preview',
		};
	},
	onHideDetails : function() {
		commentHandler.emptyCommentInput();
		Session.set('item_to_copy', null);
		Session.set('approval_item_context', null);
		navHandler.go('content_calendar');
	},
	deleteRelatedContentIfNeeded : function() {
		if(this.creatingNewItem()) {
			var itemID = Session.get('current_item_id');
			Meteor.call('removeAllAssetsForApprovalItem', itemID);
			Meteor.call('removeAllCommentsForApprovalItem', itemID);
		}
	},
	getDynamicContents : function() {
		itemContents = this.getDynamicContentFromDetails();
		return itemContents;		
	},
	onBack : function() {
		this.deleteRelatedContentIfNeeded();
		settingsWindowHandler.hide();
	},
	onCreatingNewItem : function(itemContents) {
		var approvalItem = this.generateNewApprovalItemFromContents(itemContents);
		approvalItem = customClientHandler.setCustomFieldsInItem(approvalItem);
		Meteor.call('insertApprovalItem', approvalItem);
		
		// because we're creating a new item, we dont' need to worry about changes being made
		Session.set('changes_made', false);
		settingsWindowHandler.hide();
	},
	handleUpdate : function(userTypeDetails) {
		contents = detailsHandler.getDynamicContents();
		if(Session.get('creating_new_item')) {
			detailsHandler.onCreatingNewItem(contents);
		} else {
			detailsHandler.onUpdatingExistingItem(contents, userTypeDetails);
		}
	},
	onUpdatingExistingItem : function(contents, userTypeDetails) {
		var dynamicContentsUpdated = false;
		if(_.has(userTypeDetails, 'contents')) {
			userTypeDetails['contents'] = contents;
			dynamicContentsUpdated = true;
		}
		userTypeDetails = this.addTimeToPostToUserTypeDetails(userTypeDetails);
		Meteor.call('updateStatus', Session.get('current_item_id'), userTypeDetails);
		this.afterUpdate(contents, dynamicContentsUpdated);
	},
	addTimeToPostToUserTypeDetails : function(userTypeDetails) {
		var timeToPost = Session.get('time_to_post');
		if(timeToPost != null) {
			userTypeDetails['time_to_post'] = timeToPost;
		}
		return userTypeDetails;
	},
	afterUpdate : function(contents, dynamicContentsUpdated) {
		Session.set('changes_made', false);
		settingsWindowHandler.hide();
		// the pop up module in semantic ui has issues resetting correctly when content changes
		// so were manually setting the items to be empty and flushing the system so that they can reset
		if(dynamicContentsUpdated) {
			this.resetContentToResetPopups();
		}
	},
	resetContentToResetPopups : function() {
		Session.set('reset_items', true);
		Meteor.flush();
		Session.set('reset_items', false);
		Meteor.flush();
	},
	generateNewApprovalItemFromContents : function(itemContents) {
		return {
			_id : Session.get('current_item_id'),
			contents : itemContents,
			scheduled_time : Session.get('current_scheduled_time'),
			content_type : Session.get('current_content_type'),
			scope : 'private',
			status : 'created',
			created_by : Meteor.userId(),
			created_time : moment().format("X") * 1000,
			client_id : clientHandler.getSelectedClientID(),
			type : Session.get('current_network_type'),
			time_to_post : Session.get('time_to_post'),
		};
	},
	getDynamicContentFromDetails : function() {
		var clickableInputs = Session.get('clickable_inputs');
		var itemContents = {};
		_.map(clickableInputs, function(clickableInput){
			itemContents[clickableInput.id] = clickableInput.text;
		});
		itemContents = this.addImageURLToDynamicContent(itemContents);
		itemContents = this.addFacebookLinkToDynamicContent(itemContents);
		return itemContents;
	},
	addFacebookLinkToDynamicContent : function(itemContents) {
		var facebookLink = Session.get('current_facebook_link');
		if(facebookLink != null) {
			itemContents['facebook_link'] = facebookLink;
		}	
		return itemContents;
	},
	addImageURLToDynamicContent : function(itemContents) {
		var uploadedImageURL = Session.get('uploaded_image_url');
		var imageURL = null;
		if(Session.get('creating_new_item')) {
			imageURL = uploadedImageURL;
		} else {
			imageURL = uploadedImageURL == null ? Session.get('current_item_contents').image_url : uploadedImageURL;
		}
		
		if(imageURL != null) {
			itemContents.image_url = imageURL;
		}
		return itemContents;
	},
	resetDetailsContent : function() {
		Session.set('uploaded_image_url', null);
		Session.set('current_item_contents', {});
		Session.set('current_network_type', null);
		Session.set('current_content_type', null);
		Session.set('creating_new_item', true);
		Session.set('pending_item_index', 0);
	},
	initializeAccordion : function() {
		Meteor.defer(function(){
			$('.creation-accordion').accordion();
		});
	},
	setDefaultsOnShow : function(context, creatingNewItem) {
		customClientHandler.onShowDetails(context, creatingNewItem);
		Session.set('current_facebook_link_data', {});
		Session.set('current_facebook_link', null);
		Session.set('editing_link', false);
		Session.set('link_is_loading', false);
		Session.set('image_is_loading', false);
		Session.set('tweet_length', null);
		Session.set('changes_made', false);
		Session.set('edited_input_id', null);
		Session.set('time_to_post', null);
		Session.set('editing_time', true);
		Session.set('uploaded_image_url', null);
		var itemID = creatingNewItem ? new Meteor.Collection.ObjectID()._str : context._id;
		Session.set('current_item_id', itemID);
		Session.set('current_scope', context.scope);
		Session.set('current_day', context.day);
		var status = _.has(context, 'status') ? context.status : null;
		Session.set('current_status', status);
		Session.set('current_content_type', null);
		Session.set('current_network_type', null);
		Session.set('current_scheduled_time', context.day.scheduled_time);
		Session.set('creating_new_item', creatingNewItem);
		var copiedItemContents = Session.get('item_to_copy') != null ? Session.get('item_to_copy').contents : {};
		var currentItemContents = creatingNewItem ? {} : context.contents;
		
		if(_.has(currentItemContents, 'facebook_link')) {
			Session.set('current_facebook_link', currentItemContents.facebook_link);
		}
		
		// set the facebook link from the copied item contents
		if(_.has(copiedItemContents, 'facebook_link')) {
			Session.set('current_facebook_link', copiedItemContents.facebook_link);
		}
				
		Session.set('current_item_contents', currentItemContents);
	},
	configureDetailsForExistingItem: function(context) {
		Session.set('time_to_post', context.time_to_post);
		if(context.time_to_post != null) {
			Session.set('editing_time', false);
		}
		Session.set('current_network_type', context.type);
		Session.set('current_content_type', context.content_type);
		Session.set('time_to_post', context.time_to_post);
		inputBuilder.initializeClickableInputs();
	},
	closeShownPopup : function() {
		$('#' + Session.get('shown_popup_id')).popup('remove');
	},
	getWidthClass : function() {
		return Session.get('current_network_type') != null ? Session.get('current_network_type') + '-width' : 'facebook-width';
	}
	
	
};