interface User {
    userId: string;
    url: string;
    profile: Profile;
    credentials?: Credentials[];
    collectedData?: CollectedData[];
}

interface Profile {
    name: string;
    email: string;
}

interface Credentials {
    username: string;
    password: string;
}

interface CollectedData {
    ip: string;
    userAgent: string;
    statistics: Statistics;
}

interface Statistics {
    mailRead: boolean;

}
