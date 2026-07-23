export type NosologyItem = {
  id: string;
  name: string;
};

export type NosologyCategory = {
  id: string;
  name: string;
  items: NosologyItem[];
};
