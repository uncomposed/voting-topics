export interface StarterDirectionJson {
  id: string;
  text: string;
  [key: string]: unknown;
}

export interface StarterTopicJson {
  id: string;
  title: string;
  directions?: StarterDirectionJson[];
  [key: string]: unknown;
}

export interface StarterPackJson {
  topics: StarterTopicJson[];
  [key: string]: unknown;
}
