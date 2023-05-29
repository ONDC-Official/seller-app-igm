type ChangeFields<T, R> = Omit<T, keyof R> & R;

// use this for /on_issue
export type OnIssue = ChangeFields<
  IBaseIssue,
  {
    context: Omit<Context, "ttl">;
    message: ChangeFields<
      Message,
      {
        issue: ChangeFields<
          Omit<
            Issue,
            | "order_details"
            | "issue_type"
            | "category"
            | "complainant_info"
            | "description"
            | "expected_resolution_time"
            | "expected_response_time"
            | "source"
            | "status"
            | "sub_category"
            | "rating"
            | "resolution"
            | "resolution_provider"
          >,
          {
            issue_actions: Omit<IssueActions, "complainant_actions">;
          }
        >;
      }
    >;
  }
>;

// on_issue contains complainent actions
export type IssueRequest = ChangeFields<
  IBaseIssue,
  {
    message: ChangeFields<
      Message,
      {
        issue: ChangeFields<
          Omit<Issue, "resolution" | "resolution_provider">,
          {
            complainant_info: ChangeFields<
              ComplainantInfo,
              {
                person: Omit<Person, "email">;
              }
            >;
            order_details: Omit<OrderDetails, "state" | "id">;
          }
        >;
      }
    >;
  }
>;

// use this for /on_issue_status when Seller has RESOLVED the issue

export type OnIssueStatusResoloved = ChangeFields<
  IBaseIssue,
  {
    context: Omit<Context, "ttl">;
    message: ChangeFields<
      Message,
      {
        issue: ChangeFields<
          Omit<
            Issue,
            | "order_details"
            | "issue_type"
            | "category"
            | "complainant_info"
            | "description"
            | "expected_resolution_time"
            | "expected_response_time"
            | "source"
            | "status"
            | "sub_category"
            | "rating"
          >,
          {
            issue_actions: Omit<IssueActions, "complainant_actions">;
          }
        >;
      }
    >;
  }
>;

/// Base interface for all the All Responses
export interface IBaseIssue {
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
  timestamp: string;
  ttl: string;
}
export interface Message {
  issue: Issue;
}

enum Rating {
  "THUMBS-UP",
  "THUMBS-DOWN",
}

export interface Issue {
  id: string;
  category: string;
  sub_category: string;
  complainant_info: ComplainantInfo;
  order_details: OrderDetails;
  description: Description;
  source: Source;
  expected_response_time: ExpectedResTime;
  expected_resolution_time: ExpectedResTime;
  status: string;
  issue_type: string;
  issue_actions: IssueActions;
  rating?: Rating;
  resolution: Resolution;
  resolution_provider: ResolutionProvider;
  created_at: string;
  updated_at: Date;
}

export interface ResolutionProvider {
  respondent_info: RespondentInfo;
}

export interface Organization {
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

export interface ResolutionSupport {
  chat_link: string;
  contact: Contact;
  gros: Gro[];
}

export interface Gro {
  person: Org;
  contact: Contact;
  gro_type: string;
}

export interface RespondentInfo {
  type: string;
  organization: Organization;
  resolution_support: ResolutionSupport;
}

export interface Resolution {
  short_desc: string;
  long_desc: string;
  action_triggered: string;
  refund_amount: string;
}

export interface ComplainantInfo {
  person: Person;
  contact: ComplainantInfoContact;
}
export interface ComplainantInfoContact {
  phone: string;
  email: string;
}
export interface Person {
  name: string;
  email: string;
}
export interface Description {
  short_desc: string;
  long_desc: string;
  additional_desc: AdditionalDesc;
  images: string[];
}
export interface AdditionalDesc {
  url: string;
  content_type: string;
}
export interface ExpectedResTime {
  duration: string;
}
export interface IssueActions {
  complainant_actions: ComplainantAction[];
  respondent_actions: RespondentAction[];
}
export interface ComplainantAction {
  complainant_action: string;
  short_desc: string;
  updated_at: string;
  updated_by: UpdatedBy;
}
export interface UpdatedBy {
  org: Org;
  contact: UpdatedByContact;
  person: Org;
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
export interface UpdatedByContact {
  phone: string;
  email: string;
}
export interface Org {
  name: string;
}
export interface OrderDetails {
  id: string;
  state: string;
  items: Item[];
  fulfillments: Fulfillment[];
  provider_id: string;
}
export interface Fulfillment {
  id: string;
  state: string;
}
export interface Item {
  id: string;
  quantity: number;
}
export interface Source {
  network_participant_id: string;
  type: string;
}
