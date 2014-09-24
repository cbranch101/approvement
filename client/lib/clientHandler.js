clientHandler = {
	onClientsReady : function() {
		this.setClientsByID();
	},
	setClientsByID : function() {
		var clients = Client.find().fetch();
		var clientsByID = {};
		_.map(clients, function(client){
			clientsByID[client._id] = client;
		});
		Session.set('clients_by_id', clientsByID);	
	},
	getClientName : function() {
		return Session.get('selected_client').display_name;
	},
	getTwitterProfileName : function() {
		return Session.get('selected_client').twitter_profile_name;
	},
	setSelectedClient : function(){
		Deps.autorun(function(){
			if(Session.get('clients_are_ready')) {
				var clientID = Session.get('selected_client_id');
				var clientsByID = Session.get('clients_by_id');
				Session.set('selected_client', clientsByID[clientID]);
			}
		});
	},
	handleSingleClient : function() {
		var clients = Session.get('current_clients');
		if(clients.length == 1) {
			Session.set('selected_client_id', clients[0]);
		} 
	},
	setCurrentClients : function(profile) {
		clients = this.getClientsFromProfile(profile);
		Session.set('current_clients', clients);
		clientHandler.handleSingleClient();
		this.setClientsAsReady(clients);
	},
	getClientsFromProfile : function(profile) {
		var clients = _.has(profile, 'clients') ? profile.clients : ['usa_today'];
		clients = clients == 'all' ? _.keys(Session.get('clients_by_id')) : clients;
		return clients;
	},
	setClientsAsReady : function(clients) {
		if(!Session.get('clients_are_ready')) {
			if(Session.get('clients_by_id') != {}) {
				Session.set('selected_client_id', clients[0]);
				clientHandler.setSelectedClient();
				Session.set('clients_are_ready', true);
			}
		}
	}
};