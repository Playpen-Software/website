export type TabOptions = {
    instant?: boolean;
    logPrevious?: boolean;
    removePrevious?: boolean;
}

export interface tabChangeEventDetail {
    tabId: string;
}

export interface preferenceUpdateEventDetail {
    preference: string;
}