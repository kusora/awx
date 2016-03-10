/*************************************************
 * Copyright (c) 2016 Ansible, Inc.
 *
 * All Rights Reserved
 *************************************************/

/**
 * @ngdoc function
 * @name controllers.function:JobTemplatesEdit
 * @description This controller's for Job Template Edit
*/

export default
    [   '$filter', '$scope', '$rootScope', '$compile',
        '$location', '$log', '$stateParams', 'JobTemplateForm', 'GenerateForm',
        'Rest', 'Alert',  'ProcessErrors', 'RelatedSearchInit',
        'RelatedPaginateInit','ReturnToCaller', 'ClearScope', 'InventoryList',
        'CredentialList', 'ProjectList', 'LookUpInit', 'GetBasePath', 'md5Setup',
        'ParseTypeChange', 'JobStatusToolTip', 'FormatDate', 'Wait',
        'Empty', 'Prompt', 'ParseVariableString', 'ToJSON',
        'SchedulesControllerInit', 'JobsControllerInit', 'JobsListUpdate',
        'GetChoices', 'SchedulesListInit', 'SchedulesList', 'CallbackHelpInit',
        'PlaybookRun' , 'initSurvey', '$state', 'CreateSelect2',
        function(
            $filter, $scope, $rootScope, $compile,
            $location, $log, $stateParams, JobTemplateForm, GenerateForm, Rest, Alert,
            ProcessErrors, RelatedSearchInit, RelatedPaginateInit, ReturnToCaller,
            ClearScope, InventoryList, CredentialList, ProjectList, LookUpInit,
            GetBasePath, md5Setup, ParseTypeChange, JobStatusToolTip, FormatDate, Wait,
            Empty, Prompt, ParseVariableString, ToJSON, SchedulesControllerInit,
            JobsControllerInit, JobsListUpdate, GetChoices, SchedulesListInit,
            SchedulesList, CallbackHelpInit, PlaybookRun, SurveyControllerInit, $state,
            CreateSelect2
        ) {

            ClearScope();

            var defaultUrl = GetBasePath('job_templates'),
                generator = GenerateForm,
                form = JobTemplateForm(),
                base = $location.path().replace(/^\//, '').split('/')[0],
                master = {},
                id = $stateParams.template_id,
                relatedSets = {},
                checkSCMStatus, getPlaybooks, callback,
                choicesCount = 0;


            CallbackHelpInit({ scope: $scope });

            SchedulesList.well = false;
            generator.inject(form, { mode: 'edit', related: true, scope: $scope });
            $scope.mode = 'edit';
            $scope.parseType = 'yaml';
            $scope.showJobType = false;

            SurveyControllerInit({
                scope: $scope,
                parent_scope: $scope,
                id: id
            });

            callback = function() {
                // Make sure the form controller knows there was a change
                $scope[form.name + '_form'].$setDirty();
            };

            $scope.playbook_options = null;
            $scope.playbook = null;
            generator.reset();

            getPlaybooks = function (project) {
                var url;
                if($scope.job_type.value === 'scan' && $scope.project_name === "Default"){
                    $scope.playbook_options = ['Default'];
                    $scope.playbook = 'Default';
                    Wait('stop');
                }
                else if (!Empty(project)) {
                    url = GetBasePath('projects') + project + '/playbooks/';
                    Wait('start');
                    Rest.setUrl(url);
                    Rest.get()
                        .success(function (data) {
                            var i;
                            $scope.playbook_options = [];
                            for (i = 0; i < data.length; i++) {
                                $scope.playbook_options.push(data[i]);
                                if (data[i] === $scope.playbook) {
                                    $scope.job_templates_form.playbook.$setValidity('required', true);
                                }
                            }
                            if ($scope.playbook) {
                                $scope.$emit('jobTemplateLoadFinished');
                            } else {
                                Wait('stop');
                            }
                        })
                        .error(function () {
                            Wait('stop');
                            Alert('Missing Playbooks', 'Unable to retrieve the list of playbooks for this project. Choose a different ' +
                                ' project or make the playbooks available on the file system.', 'alert-info');
                        });
                }
                else {
                    Wait('stop');
                }
            };

            $scope.jobTypeChange = function(){
              if($scope.job_type){
                if($scope.job_type.value === 'scan'){
                    $scope.toggleScanInfo();
                  }
                  else if($scope.project_name === "Default"){
                    $scope.project_name = null;
                    $scope.playbook_options = [];
                    // $scope.playbook = 'null';
                    $scope.job_templates_form.playbook.$setPristine();
                  }

              }
            };

            $scope.toggleScanInfo = function() {
                $scope.project_name = 'Default';
                if($scope.project === null){
                  getPlaybooks();
                }
                else {
                  $scope.project = null;
                }
            };

            // Detect and alert user to potential SCM status issues
            checkSCMStatus = function () {
                if (!Empty($scope.project)) {
                    Wait('start');
                    Rest.setUrl(GetBasePath('projects') + $scope.project + '/');
                    Rest.get()
                        .success(function (data) {
                            var msg;
                            switch (data.status) {
                            case 'failed':
                                msg = "The selected project has a <em>failed</em> status. Review the project's SCM settings" +
                                    " and run an update before adding it to a template.";
                                break;
                            case 'never updated':
                                msg = 'The selected project has a <em>never updated</em> status. You will need to run a successful' +
                                    ' update in order to selected a playbook. Without a valid playbook you will not be able ' +
                                    ' to save this template.';
                                break;
                            case 'missing':
                                msg = 'The selected project has a status of <em>missing</em>. Please check the server and make sure ' +
                                    ' the directory exists and file permissions are set correctly.';
                                break;
                            }
                            Wait('stop');
                            if (msg) {
                                Alert('Warning', msg, 'alert-info', null, null, null, null, true);
                            }
                        })
                        .error(function (data, status) {
                            ProcessErrors($scope, data, status, form, { hdr: 'Error!', msg: 'Failed to get project ' + $scope.project +
                                '. GET returned status: ' + status });
                        });
                }
            };

            if ($scope.removerelatedschedules) {
                $scope.removerelatedschedules();
            }
            $scope.removerelatedschedules = $scope.$on('relatedschedules', function() {
                SchedulesListInit({
                    scope: $scope,
                    list: SchedulesList,
                    choices: null,
                    related: true
                });
            });

            // Register a watcher on project_name. Refresh the playbook list on change.
            if ($scope.watchProjectUnregister) {
                $scope.watchProjectUnregister();
            }
            $scope.watchProjectUnregister = $scope.$watch('project', function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    getPlaybooks($scope.project);
                    checkSCMStatus();
                }
            });



            // Turn off 'Wait' after both cloud credential and playbook list come back
            if ($scope.removeJobTemplateLoadFinished) {
                $scope.removeJobTemplateLoadFinished();
            }
            $scope.removeJobTemplateLoadFinished = $scope.$on('jobTemplateLoadFinished', function () {
                CreateSelect2({
                    element:'#job_templates_job_type',
                    multiple: false
                });

                CreateSelect2({
                    element:'#playbook-select',
                    multiple: false
                });

                CreateSelect2({
                    element:'#job_templates_verbosity',
                    multiple: false
                });

                for (var set in relatedSets) {
                    $scope.search(relatedSets[set].iterator);
                }
                SchedulesControllerInit({
                    scope: $scope,
                    parent_scope: $scope,
                    iterator: 'schedule'
                });

            });

            // Set the status/badge for each related job
            if ($scope.removeRelatedCompletedJobs) {
                $scope.removeRelatedCompletedJobs();
            }
            $scope.removeRelatedCompletedJobs = $scope.$on('relatedcompleted_jobs', function () {
                JobsControllerInit({
                    scope: $scope,
                    parent_scope: $scope,
                    iterator: form.related.completed_jobs.iterator
                });
                JobsListUpdate({
                    scope: $scope,
                    parent_scope: $scope,
                    list: form.related.completed_jobs
                });
            });

            if ($scope.cloudCredentialReadyRemove) {
                $scope.cloudCredentialReadyRemove();
            }
            $scope.cloudCredentialReadyRemove = $scope.$on('cloudCredentialReady', function (e, name) {
                var CloudCredentialList = {};
                $scope.cloud_credential_name = name;
                master.cloud_credential_name = name;
                // Clone the CredentialList object for use with cloud_credential. Cloning
                // and changing properties to avoid collision.
                jQuery.extend(true, CloudCredentialList, CredentialList);
                CloudCredentialList.name = 'cloudcredentials';
                CloudCredentialList.iterator = 'cloudcredential';
                LookUpInit({
                    url: GetBasePath('credentials') + '?cloud=true',
                    scope: $scope,
                    form: form,
                    current_item: $scope.cloud_credential,
                    list: CloudCredentialList,
                    field: 'cloud_credential',
                    hdr: 'Select Cloud Credential',
                    input_type: "radio"
                });
                $scope.$emit('jobTemplateLoadFinished');
            });


            // Retrieve each related set and populate the playbook list
            if ($scope.jobTemplateLoadedRemove) {
                $scope.jobTemplateLoadedRemove();
            }
            $scope.jobTemplateLoadedRemove = $scope.$on('jobTemplateLoaded', function (e, related_cloud_credential, masterObject, relatedSets) {
                var dft, set;
                master = masterObject;
                getPlaybooks($scope.project);

                for (set in relatedSets) {
                    $scope.search(relatedSets[set].iterator);
                }

                dft = ($scope.host_config_key === "" || $scope.host_config_key === null) ? false : true;
                md5Setup({
                    scope: $scope,
                    master: master,
                    check_field: 'allow_callbacks',
                    default_val: dft
                });

                ParseTypeChange({ scope: $scope, field_id: 'job_templates_variables', onChange: callback });

                if (related_cloud_credential) {
                    Rest.setUrl(related_cloud_credential);
                    Rest.get()
                        .success(function (data) {
                            $scope.$emit('cloudCredentialReady', data.name);
                        })
                        .error(function (data, status) {
                            ProcessErrors($scope, data, status, null, {hdr: 'Error!',
                                msg: 'Failed to related cloud credential. GET returned status: ' + status });
                        });
                } else {
                    // No existing cloud credential
                    $scope.$emit('cloudCredentialReady', null);
                }
            });

            Wait('start');

            if ($scope.removeEnableSurvey) {
                $scope.removeEnableSurvey();
            }
            $scope.removeEnableSurvey = $scope.$on('EnableSurvey', function(fld) {

                $('#job_templates_survey_enabled_chbox').attr('checked', $scope[fld]);
                Rest.setUrl(defaultUrl + id+ '/survey_spec/');
                Rest.get()
                    .success(function (data) {
                        if(!data || !data.name){
                            $('#job_templates_delete_survey_btn').hide();
                            $('#job_templates_edit_survey_btn').hide();
                            $('#job_templates_create_survey_btn').show();
                        }
                        else {
                            $scope.survey_exists = true;
                            $('#job_templates_delete_survey_btn').show();
                            $('#job_templates_edit_survey_btn').show();
                            $('#job_templates_create_survey_btn').hide();
                        }
                    })
                    .error(function (data, status) {
                        ProcessErrors($scope, data, status, form, {
                            hdr: 'Error!',
                            msg: 'Failed to retrieve job template: ' + $stateParams.template_id + '. GET status: ' + status
                        });
                    });
            });

            if ($scope.removeSurveySaved) {
                $scope.rmoveSurveySaved();
            }
            $scope.removeSurveySaved = $scope.$on('SurveySaved', function() {
                Wait('stop');
                $scope.survey_exists = true;
                $scope.invalid_survey = false;
                $('#job_templates_survey_enabled_chbox').attr('checked', true);
                $('#job_templates_delete_survey_btn').show();
                $('#job_templates_edit_survey_btn').show();
                $('#job_templates_create_survey_btn').hide();

            });

            if ($scope.removeLoadJobs) {
                $scope.rmoveLoadJobs();
            }
            $scope.removeLoadJobs = $scope.$on('LoadJobs', function() {
                $scope.fillJobTemplate();
            });

            if ($scope.removeChoicesReady) {
                $scope.removeChoicesReady();
            }
            $scope.removeChoicesReady = $scope.$on('choicesReady', function() {
                choicesCount++;
                if (choicesCount === 4) {
                    $scope.$emit('LoadJobs');
                }
            });

            GetChoices({
                scope: $scope,
                url: GetBasePath('unified_jobs'),
                field: 'status',
                variable: 'status_choices',
                callback: 'choicesReady'
            });

            GetChoices({
                scope: $scope,
                url: GetBasePath('unified_jobs'),
                field: 'type',
                variable: 'type_choices',
                callback: 'choicesReady'
            });

            // setup verbosity options lookup
            GetChoices({
                scope: $scope,
                url: defaultUrl,
                field: 'verbosity',
                variable: 'verbosity_options',
                callback: 'choicesReady'
            });

            // setup job type options lookup
            GetChoices({
                scope: $scope,
                url: defaultUrl,
                field: 'job_type',
                variable: 'job_type_options',
                callback: 'choicesReady'
            });

            function saveCompleted() {
                setTimeout(function() {
                  $scope.$apply(function() {
                    var base = $location.path().replace(/^\//, '').split('/')[0];
                    if (base === 'job_templates') {
                        ReturnToCaller();
                    }
                    else {
                        ReturnToCaller(1);
                    }
                  });
                }, 500);
            }

            if ($scope.removeTemplateSaveSuccess) {
                $scope.removeTemplateSaveSuccess();
            }
            $scope.removeTemplateSaveSuccess = $scope.$on('templateSaveSuccess', function(e, data) {
                Wait('stop');
                if ($scope.allow_callbacks && ($scope.host_config_key !== master.host_config_key || $scope.callback_url !== master.callback_url)) {
                    if (data.related && data.related.callback) {
                        Alert('Callback URL', '<p>Host callbacks are enabled for this template. The callback URL is:</p>'+
                            '<p style="padding: 10px 0;"><strong>' + $scope.callback_server_path + data.related.callback + '</strong></p>'+
                            '<p>The host configuration key is: <strong>' + $filter('sanitize')(data.host_config_key) + '</strong></p>', 'alert-info', saveCompleted, null, null, null, true);
                    }
                    else {
                        saveCompleted();
                    }
                }
                else {
                    saveCompleted();
                }
            });



            // Save changes to the parent
            $scope.formSave = function () {
                $scope.invalid_survey = false;
                if ($scope.removeGatherFormFields) {
                    $scope.removeGatherFormFields();
                }
                $scope.removeGatherFormFields = $scope.$on('GatherFormFields', function(e, data) {
                    generator.clearApiErrors();
                    Wait('start');
                    data = {};
                    var fld;
                    try {
                        // Make sure we have valid variable data
                        data.extra_vars = ToJSON($scope.parseType, $scope.variables, true);
                        if(data.extra_vars === undefined ){
                            throw 'undefined variables';
                        }
                        for (fld in form.fields) {
                            if (form.fields[fld].type === 'select' && fld !== 'playbook') {
                                data[fld] = $scope[fld].value;
                            } else {
                                if (fld !== 'variables' && fld !== 'callback_url') {
                                    data[fld] = $scope[fld];
                                }
                            }
                        }
                        Rest.setUrl(defaultUrl + id + '/');
                        Rest.put(data)
                            .success(function (data) {
                                $scope.$emit('templateSaveSuccess', data);
                            })
                            .error(function (data, status) {
                                ProcessErrors($scope, data, status, form, { hdr: 'Error!',
                                    msg: 'Failed to update job template. PUT returned status: ' + status });
                            });

                    } catch (err) {
                        Wait('stop');
                        Alert("Error", "Error parsing extra variables. Parser returned: " + err);
                    }
                });


                if ($scope.removePromptForSurvey) {
                    $scope.removePromptForSurvey();
                }
                $scope.removePromptForSurvey = $scope.$on('PromptForSurvey', function() {
                    var action = function () {
                            // $scope.$emit("GatherFormFields");
                            Wait('start');
                            $('#prompt-modal').modal('hide');
                            $scope.addSurvey();

                        };
                    Prompt({
                        hdr: 'Incomplete Survey',
                        body: '<div class="Prompt-bodyQuery">Do you want to create a survey before proceeding?</div>',
                        action: action
                    });
                });

                // users can't save a survey with a scan job
                if($scope.job_type.value === "scan" && $scope.survey_enabled === true){
                    $scope.survey_enabled = false;
                }
                if($scope.survey_enabled === true && $scope.survey_exists!==true){
                    // $scope.$emit("PromptForSurvey");

                    // The original design for this was a pop up that would prompt the user if they wanted to create a
                    // survey, because they had enabled one but not created it yet. We switched this for now so that
                    // an error message would be displayed by the survey buttons that tells the user to add a survey or disabled
                    // surveys.
                    $scope.invalid_survey = true;
                    return;
                } else {
                    $scope.$emit("GatherFormFields");
                }

            };

            $scope.formCancel = function () {
                $state.transitionTo('jobTemplates');
            };

            // Related set: Add button
            $scope.add = function (set) {
                $rootScope.flashMessage = null;
                $location.path('/' + base + '/' + $stateParams.template_id + '/' + set);
            };

            // Related set: Edit button
            $scope.edit = function (set, id) {
                $rootScope.flashMessage = null;
                $location.path('/' + set + '/' + id);
            };

            // Launch a job using the selected template
            $scope.launch = function() {

                if ($scope.removePromptForSurvey) {
                    $scope.removePromptForSurvey();
                }
                $scope.removePromptForSurvey = $scope.$on('PromptForSurvey', function() {
                    var action = function () {
                            // $scope.$emit("GatherFormFields");
                            Wait('start');
                            $('#prompt-modal').modal('hide');
                            $scope.addSurvey();

                        };
                    Prompt({
                        hdr: 'Incomplete Survey',
                        body: '<div class="Prompt-bodyQuery">Do you want to create a survey before proceeding?</div>',
                        action: action
                    });
                });
                if($scope.survey_enabled === true && $scope.survey_exists!==true){
                    $scope.$emit("PromptForSurvey");
                }
                else {

                    PlaybookRun({
                        scope: $scope,
                        id: id
                    });
                }
            };

            // handler for 'Enable Survey' button
            $scope.surveyEnabled = function(){
                Rest.setUrl(defaultUrl + id+ '/');
                Rest.patch({"survey_enabled": $scope.survey_enabled})
                    .success(function (data) {

                        if(Empty(data.summary_fields.survey)){
                            $('#job_templates_delete_survey_btn').hide();
                            $('#job_templates_edit_survey_btn').hide();
                            $('#job_templates_create_survey_btn').show();
                        }
                        else{
                            $scope.survey_exists = true;
                            $('#job_templates_delete_survey_btn').show();
                            $('#job_templates_edit_survey_btn').show();
                            $('#job_templates_create_survey_btn').hide();
                        }
                    })
                    .error(function (data, status) {
                        ProcessErrors($scope, data, status, form, {
                            hdr: 'Error!',
                            msg: 'Failed to retrieve save survey_enabled: ' + $stateParams.template_id + '. GET status: ' + status
                        });
                    });
            };


        }
    ];