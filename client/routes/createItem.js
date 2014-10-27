if(Meteor.isClient) {
	var HomeController = RouteController.extend({
	    template: 'defaultBody'
	});
		
	Router.map(function () {
	    this.route('createItem', {
	        path :  'client/:client/week/:week/content/create',
	        controller :  HomeController,
	        onRun : function() {
	        	if(loginHandler.isLoggedIn()) {
		        	var that = this;
		        	Deps.autorun(function(){
			        	var context = Session.get('approval_item_context');
						if(context == null) {
							calendarBuilder.goToNewWeek(that.params.client, that.params.week);
						} else {
							if(Session.get('page_is_ready')) {
								creatingNew = true;
								calendarBuilder.initializeCalendarWeek(that.params.client, that.params.week);						
								detailsHandler.showDetails(context, creatingNew);
							}
						}
		        	});	        	
	        	} else {
		        	Router.go('/login');
	        	}
	        },
	    });
	});
}