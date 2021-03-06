var app = angular.module('codecraft', [
	'ngResource',
	'infinite-scroll',
	'angularSpinner',
	'jcs-autoValidate',
	'angular-ladda',
	'mgcrea.ngStrap',
	'toaster',
	'ngAnimate'
]);

//Config is called before the $http service 
app.config(function ($httpProvider,$resourceProvider,laddaProvider) {
	$httpProvider.defaults.headers.common['Authorization'] = '';//Token here
	$resourceProvider.defaults.stripTrailingSlashes = false; // Stop the trailing slashes from being stripped
	laddaProvider.setOption({
		style:'expand-right'
	});
});

app.factory("Contact", function ($resource) {
	//Including the PUT method since Angular Resource does not support it in default
	return $resource("https://codecraftpro.com/api/samples/v1/contact/:id/", {id: '@id'}, {
		update: {
			method: 'PUT'
		}
	});
});

app.controller('PersonDetailController', function ($scope, ContactService) {
	$scope.contacts = ContactService;

	//Update function upon save button is clicked
	$scope.save = function(){
		$scope.contacts.updateContact($scope.contacts.selectedPerson)
	}

	//Delete operation
	$scope.remove = function(){
		$scope.contacts.removeContact($scope.contacts.selectedPerson)
	}
});

//To use the modal within the controller, we need to inject a service called modal here
app.controller('PersonListController', function ($scope, $modal, ContactService) {

	$scope.search = "";
	$scope.order = "email";
	$scope.contacts = ContactService;
	$scope.loadMore = function(){
		console.log("Load More");
		$scope.contacts.loadMore();
	};

	$scope.showCreateModal = function(){
		$scope.contacts.selectedPerson = {};
		$scope.createModal = $modal({
			scope : $scope,
			template: 'templates/modal.create.tpl.html',
			show:true
		})
	};

	$scope.createContact = function(){
		console.log('Contact Created');
		$scope.contacts.createContact($scope.contacts.selectedPerson)
		.then(function(){
			$scope.createModal.hide();
		})
	}

	$scope.$watch('search',function(newVal,oldVal){
		//Check if new value is defined, since it msut be defined
		if(angular.isDefined(newVal)){
			$scope.contacts.doSearch(newVal);
		}
	})

	$scope.$watch('order',function(newVal,oldVal){
		//Check if new value is defined, since it msut be defined
		if(angular.isDefined(newVal)){
			$scope.contacts.doOrder(newVal);
		}
	})
});

// Inject the q service, which enables you to create promise that can be returned as function
app.service('ContactService', function (Contact,$q,toaster) {
	var self = {
		'addPerson': function (person) {
			this.persons.push(person);
		},
		'page': 1,
		'hasMore':true,
		'isLoading':false, // These 3 are for paginating data
		'isSaving':false, 
		'selectedPerson': null,
		'persons': [],
		'search': null,
		//Reset the first three variables
		'doSearch': function(search){
			self.hasMore = true;
			self.page = 1;
			self.persons = [];
			self.search = search;
			self.loadContacts();
		},
		'doOrder': function(order){
			self.hasMore = true;
			self.page = 1;
			self.persons = [];
			//API is expecting the name ordering
			self.ordering = order;
			self.loadContacts();
		},
		'loadContacts': function(){
			//Wrap the function inside the if statement and run it if there's more data and isLoading function is not called
			if(self.hasMore && !self.isLoading){
				self.isLoading = true;

				// Include this in the indicate the page number we want to 
				var params = {
					'page':self.page,
					'search':self.search,
					'ordering':self.ordering
				};
				// The first parameter will be sent as query parameter at the end of the URL
				Contact.get(params,function(data){
					console.log(data);
					angular.forEach(data.results,function(person){
						/*
						
						 When we created the list of people, we stored a new resource of person. 
						 This means we can use the functions to interact with the resource on top of the person object
						
						*/
						self.persons.push(new Contact(person));
					})
					//If there's no more data, set the hasMore function to false
					if(!data.next){
						self.hasMore = false;
					}
					self.isLoading = false;
				});
			}
		},
		'loadMore':function(){
			if(self.hasMore && !self.isLoading){
				self.page += 1;
				self.loadContacts();
			}
		},
		'updateContact':function(person){
			console.log('Service Call Updated');
			self.isSaving = true;
			person.$update().then(function(){
				self.isSaving = false;
				toaster.pop('success','Updated' + person.name);
			});
		},
		'removeContact':function(person){
			self.isDeleting = true;
			//Built in remove function, which will send a http delete msg to API endpoint
			person.$remove().then(function(){
				self.isDeleting = false;
				var index = self.persons.indexOf(person);
				self.persons.splice(index,1);
				self.selectedPerson = null;
				toaster.pop('success','Deleted' + person.name);
			});
		},
		'createContact': function(person){
			var d = $q.defer();
			self.isSaving = true;
			Contact.save(person).$promise.then(function(){
				self.isSaving = false;
				self.selectedPerson = null;
				self.hasMore = true;
				self.page = 1;
				self.persons = [];
				self.loadContacts()
				toaster.pop('success','Created' + person.name);
				d.resolve()
			});
			return d.promise;
		},
	};

	self.loadContacts();
	return self;
});