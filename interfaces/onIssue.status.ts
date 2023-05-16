export interface OnIssueStatus {
    context: Context;
    message: Message;
}

export interface Context {
    domain:         string;
    country:        string;
    city:           string;
    action:         string;
    core_version:   string;
    bap_id:         string;
    bap_uri:        string;
    bpp_id:         string;
    bpp_uri:        string;
    transaction_id: string;
    message_id:     string;
    timestamp:      Date;
}

export interface Message {
    issue: Issue;
}

export interface Issue {
    id:                  string;
    issue_actions:       IssueActions;
    created_at:          Date;
    updated_at:          Date;
    resolution_provider: ResolutionProvider;
    resolution:          Resolution;
}

export interface IssueActions {
    respondent_actions: RespondentAction[];
}

export interface RespondentAction {
    respondent_action: string;
    short_desc:        string;
    updated_at:        Date;
    updated_by:        Organization;
    cascaded_level:    number;
}

export interface Organization {
    org:     Org;
    contact: Contact;
    person:  Org;
}

export interface Contact {
    phone: string;
    email: string;
}

export interface Org {
    name: string;
}

export interface Resolution {
    short_desc:       string;
    long_desc:        string;
    action_triggered: string;
    refund_amount:    string;
}

export interface ResolutionProvider {
    respondent_info: RespondentInfo;
}

export interface RespondentInfo {
    type:               string;
    organization:       Organization;
    resolution_support: ResolutionSupport;
}

export interface ResolutionSupport {
    chat_link: string;
    contact:   Contact;
    gros:      Gro[];
}

export interface Gro {
    person:   Org;
    contact:  Contact;
    gro_type: string;
}