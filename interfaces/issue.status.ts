export interface IssueStatus {
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
    ttl:            string;
}

export interface Message {
    issue_id: string;
}