import { MenuTypes, GridViewDetail, SystemDataSourceNames, ColumnModel, ButtonColours, ActionTypes } from 'ngscaffolding-models';
import { MenuService } from 'ngscaffolding-core';

export function buildMenu(menuService: MenuService) {
    // User Admin Functions
    menuService.addMenuItemsFromCode([
        {
            label: 'User Administration',
            name: 'user.admin',
            type: MenuTypes.Folder,
            icon: 'person_add',
            roles: ['user_admin', 'admin'],
            items: [
                {
                    name: 'user.admin.list',
                    routerLink: 'datagrid/user.admin.list',
                    roles: ['user_admin', 'admin'],
                    label: 'User List',
                    icon: 'people',
                    type: MenuTypes.Datagrid,
                    menuDetails: <GridViewDetail>{
                        title: 'User List',
                        selectDataSourceName: SystemDataSourceNames.USERS_SELECT,
                        columns: [
                            <ColumnModel>{ field: 'userId', headerName: 'User ID' },
                            <ColumnModel>{ field: 'email', headerName: 'Email Address' },
                            <ColumnModel>{ field: 'firstName', headerName: 'First Name' },
                            <ColumnModel>{ field: 'lastName', headerName: 'Last Name' }
                        ],
                        actions: [
                            {
                                columnButton: true,
                                title: 'Edit User',
                                icon: 'ui-icon-assignment',
                                colour: ButtonColours.teal,
                                type: 'angularComponent',
                                angularComponent: 'app-user-details',
                                dialogOptions: {
                                    header: 'User Details',
                                    width: 900,
                                    height: 600,
                                    closable: true,
                                    maximizable: true
                                }
                            },
                            {
                                columnButton: true,
                                title: 'Password',
                                icon: 'ui-icon-lock',
                                colour: ButtonColours.secondary,
                                type: 'angularComponent',
                                angularComponent: 'app-user-set-password',
                                dialogOptions: {
                                    header: 'User Details',
                                    width: 600,
                                    height: 400,
                                    closable: true,
                                    maximizable: true
                                }
                            },
                            {
                                columnButton: true,
                                title: 'Delete',
                                icon: 'ui-icon-lock',
                                colour: ButtonColours.warning,
                                type: ActionTypes.dataSource,
                                confirmationMessage: 'Confirm Delete',
                                dataSourceName: SystemDataSourceNames.USERS_DELETE,
                                refresh: true,
                                successMessage: 'User Deleted',
                                errorMessage: 'User Not Deleted'
                            },
                            {
                                title: 'Add User',
                                icon: 'ui-icon-add',
                                colour: ButtonColours.success,
                                type: 'angularComponent',
                                angularComponent: 'app-user-details',
                                idValue: 'new',
                                dialogOptions: {
                                    header: 'New User Details',
                                    width: 900,
                                    height: 600,
                                    closable: true,
                                    maximizable: true
                                }
                            }
                        ]
                    }
                }
            ]
        }
    ]);
}
