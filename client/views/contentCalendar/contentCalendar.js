Template['contentCalendar'].helpers({
	calendar_days : function() {
		// maps a status to the color that's going to be displayed
		return calendarBuilder.getCalendarDays();
	},
	details_shown : function() {
		return detailsHandler.detailsShown();
	},
	is_not_client : function() {
		return !userHandler.userIsType('client');
	},
	show_class : function() {
		return detailsHandler.detailsShown() ? 'hidden' : '';
	},
});

Template['contentCalendar'].events({
	'click .right.arrow' : function(event) {
		timeHandler.changeToNextWeek();
	},
	'click .left.arrow' : function(event) {
		timeHandler.changeToLastWeek();
	},
	'dragenter .forward.arrow.column' : function(event) {
		timeHandler.changeToNextWeek();
		event.preventDefault();
	},
	'dragover .forward.arrow.column' : function(event) {
		event.preventDefault();
	},
	'dragleave .forward.arrow.column' : function() {
		event.preventDefault();
	}
	
});

