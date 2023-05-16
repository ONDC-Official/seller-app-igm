export interface OnIssue {
  context: Context;
  message: Message;
}

export interface Context {
  domain: string;
  country: string;
  city: string;
  action: string;
  core_version: string;
  bap_id: string;
  bap_uri: string;
  bpp_id: string;
  bpp_uri: string;
  transaction_id: string;
  message_id: string;
  timestamp: Date;
}

export interface Message {
  issue: Issue;
}

export interface Issue {
  id: string;
  issue_actions: IssueActions;
  created_at: Date;
  updated_at: Date;
}

export interface IssueActions {
  respondent_actions: RespondentAction[];
}

export interface RespondentAction {
  respondent_action: string;
  short_desc: string;
  updated_at: Date;
  updated_by: UpdatedBy;
  cascaded_level: number;
}

export interface UpdatedBy {
  org: Org;
  contact: Contact;
  person: Org;
}

export interface Contact {
  phone: string;
  email: string;
}

export interface Org {
  name: string;
}
