type ChangeFields<T, R> = Omit<T, keyof R> & R;

export type _Issue = ChangeFields<
  IBaseIssue,
  {
    message: ChangeFields<
      Message,
      { issue: Omit<Issue, "rating" | "resolution" | "resolution_provider"> }
    >;
  }
>;

// use this for /on_issue
export type _On_Issue = ChangeFields<
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

// use this for /on_issue_status when Seller has RESOLVED the issue 

export type _On_Issue_Status_Resoloved = ChangeFields<
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

const newIssue: _On_Issue = {
  context: {
    domain: "ONDC:RET10",
    country: "IND",
    city: "std:080",
    action: "on_issue",
    core_version: "1.0.0",
    bap_id: "buyerapp.com",
    bap_uri: "https://buyerapp.com/ondc",
    bpp_id: "sellerapp.com",
    bpp_uri: "https://sellerapp.com/ondc",
    transaction_id: "T1",
    message_id: "M1",
    timestamp: "2023-01-15T10:10:00.142Z",
  },
  message: {
    issue: {
      id: "I1",
      issue_actions: {
        respondent_actions: [
          {
            respondent_action: "PROCESSING",
            short_desc: "Complaint is being processed",
            updated_at: "2023-01-15T10:10:00.142Z",
            updated_by: {
              org: {
                name: "https://sellerapp.com/ondc::ONDC:RET10",
              },
              contact: {
                phone: "9450394140",
                email: "respondentapp@respond.com",
              },
              person: {
                name: "Jane Doe",
              },
            },
            cascaded_level: 1,
          },
        ],
      },
      created_at: "2023-01-15T10:00:00.469Z",
      updated_at: "2023-01-15T10:10:00.142Z",
    },
  },
};
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
  updated_at: string;
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
  updated_at: string;
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
