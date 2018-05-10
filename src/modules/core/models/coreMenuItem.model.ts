import { MenuItem } from 'primeng/primeng';

export class CoreMenuItem implements MenuItem {

    name?: string;

    roles?: string[];

    label?: string;
    icon?: string;
    command?: (event?: any) => void;
    url?: string;
    routerLink?: any;
    queryParams?: {
        [k: string]: any;
    };
    items?: CoreMenuItem[] | CoreMenuItem[][] ;
    expanded?: boolean;
    disabled?: boolean;
    visible?: boolean;
    target?: string;
    routerLinkActiveOptions?: any;
    separator?: boolean;
    badge?: string;
    badgeStyleClass?: string;
    style?: any;
    styleClass?: string;
    title?: string;
    jsonSerialized?: string;

    constructor(){

    }
}