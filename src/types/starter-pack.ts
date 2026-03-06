export interface StarterItemJson {
  id: string;
  text: string;
  topicIds?: string[];
  [key: string]: unknown;
}

export interface StarterTopicJson {
  id: string;
  title: string;
  directions?: StarterItemJson[];
  [key: string]: unknown;
}

export interface StarterPackJson {
  topics: StarterTopicJson[];
  items?: StarterItemJson[];
  [key: string]: unknown;
}
