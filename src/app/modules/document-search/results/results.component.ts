// Core imports
import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

// Third party imports
import { TranslateService } from '@ngx-translate/core';
import {
  Column,
  ColumnViewTemplate,
  UserService,
} from '@onecx/portal-integration-angular';
import { MenuItem, SelectItem } from 'primeng/api';
import { DataView } from 'primeng/dataview';

// Application imports
import { AttachmentUploadService } from '../../document-detail/attachment-upload.service';
import { DocumentDetailDTO } from 'src/app/generated';
import { generateFilteredColumns, initFilteredColumns } from 'src/app/utils';

enum SortOrder {
  ASCENDING,
  DESCENDING,
}

@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss'],
})
export class ResultsComponent implements OnInit {
  // eslint-disable-next-line @angular-eslint/no-input-rename
  @Input('results') set resultsArray(value: DocumentDetailDTO[]) {
    this.results = value;
    this.showPageReport = this.results?.length > 0;
    this.showPaginator = this.results?.length > 0;
  }
  @Input() isShow: boolean;
  @Input() isSearchClicked: boolean;
  @Input() totalElements: number;
  @Output() deleteDocument: EventEmitter<any> = new EventEmitter();
  @Output() isLoadMoreDisableEvent: EventEmitter<boolean> = new EventEmitter();
  @Output() updatedView: EventEmitter<any> = new EventEmitter();

  fileCount = 0;
  first: number;
  rowsPerPage = 20;
  sortOrder = -1;
  deleteDialogVisible: boolean;
  showCount = false;
  showPageReport = false;
  showPaginator = false;

  dataView: DataView;
  selectedDocument: DocumentDetailDTO;
  selectedSortField: SelectItem;
  sortOrderType: SortOrder = SortOrder.DESCENDING;
  rowsPerPageOptions = [20, 50, 100];
  results: DocumentDetailDTO[];
  items: MenuItem[] = [];
  sortFields: SelectItem[];
  filteredColumns: Column[] = [];
  columns: Column[] = [
    {
      field: 'name',
      header: 'NAME',
      translationPrefix: 'RESULTS',
      active: true,
    },
    {
      field: 'type.name',
      header: 'DOCUMENT_TYPE',
      translationPrefix: 'RESULTS',
      active: true,
    },

    {
      field: 'lifeCycleState',
      header: 'STATUS',
      translationPrefix: 'RESULTS',
      active: true,
    },
    {
      field: 'documentVersion',
      header: 'VERSION',
      translationPrefix: 'RESULTS',
      active: true,
    },
    {
      field: 'creationUser',
      header: 'CREATED',
      translationPrefix: 'RESULTS',
      active: false,
    },
    {
      field: 'creationDate',
      header: 'CREATED_ON',
      translationPrefix: 'RESULTS',
      active: false,
    },
    {
      field: 'modificationDate',
      header: 'MODIFICATION_DATE',
      translationPrefix: 'RESULTS',
      active: false,
    },
  ];
  columnTemplate: ColumnViewTemplate[] = [
    {
      label: 'DOCUMENT_DETAIL.COLUMN_TEMPLATES.EXTENDED',
      template: [
        { field: 'name', active: true },
        { field: 'type.name', active: true },
        { field: 'lifeCycleState', active: true },
        { field: 'documentVersion', active: true },
        { field: 'creationUser', active: false },
        { field: 'creationDate', active: false },
        { field: 'modificationDate', active: true },
      ],
    },
    {
      label: 'DOCUMENT_DETAIL.COLUMN_TEMPLATES.FULL',
      template: [
        { field: 'name', active: true },
        { field: 'type.name', active: true },
        { field: 'lifeCycleState', active: true },
        { field: 'documentVersion', active: true },
        { field: 'creationUser', active: true },
        { field: 'creationDate', active: true },
        { field: 'modificationDate', active: true },
      ],
    },
  ];

  layout: 'table' | 'list' | 'grid' = 'table';
  routerUrl: string;
  sortField: string = null;
  translatedData: object;

  constructor(
    private userService: UserService,
    private readonly router: Router,
    private readonly translateService: TranslateService,
    private readonly activeRoute: ActivatedRoute,
    private readonly attachmentUploadService: AttachmentUploadService
  ) {}

  ngOnInit() {
    this.getTranslatedData();
    this.filteredColumns = initFilteredColumns(this.columns);
  }
  /**
   * function to get translatedData from translateService
   */
  getTranslatedData(): void {
    this.translateService
      .get([
        'GENERAL.EDIT',
        'GENERAL.DELETE',
        'GENERAL.SORT',
        'RESULTS.LAST_MODIFIED',
        'RESULTS.DATE_CREATED',
        'RESULTS.TITLE',
        'RESULTS.NAME',
        'RESULTS.DOCUMENT_TYPE',
        'RESULTS.STATUS',
        'RESULTS.ATTACHMENTS',
        'RESULTS.MODIFICATION_DATE',
        'DOCUMENT_DETAIL.COLUMN_TEMPLATES.EXTENDED',
        'DOCUMENT_DETAIL.COLUMN_TEMPLATES.FULL',
        'DOCUMENT_DETAIL.COLUMN_TEMPLATES.PLACEHOLDER',
      ])
      .subscribe((text: object) => {
        this.translatedData = text;
        this.constructMenu();
        this.sortFields = [
          {
            label: this.translatedData['RESULTS.LAST_MODIFIED'],
            value: 'modificationDate',
          },
          {
            label: this.translatedData['RESULTS.DATE_CREATED'],
            value: 'creationDate',
          },
          {
            label: this.translatedData['RESULTS.TITLE'],
            value: 'name',
          },
        ];
      });
  }
  /**
   * Sets the record of selected document
   * @param event holds the record of selected document.
   */
  setSelectedDocument(event: DocumentDetailDTO) {
    this.selectedDocument = event;
  }
  /**
   * Closes the delete confirmation dialog box if user selects no option
   */
  onCancelDelete() {
    this.selectedDocument = undefined;
    this.deleteDialogVisible = false;
  }
  /**
   * Emits the selected document id to the parent component if user selects yes option from the dialog box
   */
  onDelete() {
    if (this.selectedDocument != undefined) {
      this.deleteDocument.emit(this.selectedDocument.id);
    }
    this.deleteDialogVisible = false;
  }
  /**
   * Tracks the updated value of view layout
   */
  updateResultsLayout(event: any) {
    this.layout = event;
    this.updatedView.emit(this.layout);
  }
  /**
   * Creates actions list on document
   */
  private constructMenu() {
    const itemList = [
      {
        permission: 'DOCUMENT_MGMT#DOCUMENT_EDIT',
        object: {
          label: this.translatedData['GENERAL.EDIT'],
          icon: 'pi pi-pencil',
          command: () => {
            const id = this.selectedDocument.id;
            this.selectedDocument = undefined;
            this.router.navigate(['../detail/edit/', id], {
              relativeTo: this.activeRoute,
            });
          },
        },
      },
      {
        object: {
          label: this.translatedData['GENERAL.DELETE'],
          icon: 'pi pi-trash',
          command: (event) => {
            this.deleteDialogVisible = true;
          },
        },
      },
    ];
    this.addAccessableItems(itemList);
  }
  /**
   * Add accessacle actions to item list
   */
  addAccessableItems(items: any) {
    for (const entry of items) {
      if (
        entry.permission
          ? this.userService.hasPermission(entry.permission)
          : true
      ) {
        this.items.push(entry.object);
      }
    }
  }

  /**
   * Add the sort type
   */
  onSortOrderChange(sortOrder: boolean) {
    this.sortOrderType =
      sortOrder === true ? SortOrder.ASCENDING : SortOrder.DESCENDING;
    this.updateSorting();
  }
  /**
   * Add sort field
   */
  onSortFieldChange(sortField: string) {
    this.sortField = sortField;
    this.updateSorting();
  }
  /**
   * Sorting the field as per field names
   */
  updateSorting() {
    if (this.sortField === 'modificationDate') {
      this.sortOrder = this.sortOrderType === SortOrder.ASCENDING ? -1 : 1;
    } else {
      this.sortOrder = this.sortOrderType === SortOrder.ASCENDING ? 1 : -1;
    }
  }
  /**
   * Function to handle coulmn change in table view
   * @Param Active columns Id
   */
  handleColumnChange(activeColumnIds: string[]) {
    const { columns, filteredColumns } = generateFilteredColumns(
      activeColumnIds,
      this.columns
    );

    this.columns = columns;
    this.filteredColumns = filteredColumns;
  }
  /**
   * function to set pagination index to zero
   */
  ngOnChanges() {
    if (this.isSearchClicked) {
      this.first = 0;
    }
  }
  /**
   * function emits isLoadMoreDisableEvent depending on search result length
   * @param event
   */
  onPageChange(event) {
    if (this.totalElements == this.results.length) {
      this.isLoadMoreDisableEvent.emit(true);
    } else if (event.first >= this.results?.length - event.rows) {
      this.isLoadMoreDisableEvent.emit(false);
    } else if (this.results?.length <= event.rows) {
      this.isLoadMoreDisableEvent.emit(false);
    } else {
      this.isLoadMoreDisableEvent.emit(true);
    }
  }

  /**
   * function to get attachment Icon according to file type.
   * And count of files if more than 1 file which are successfully stored in Minio
   * @param result attachment data
   */
  getAttachmentIcon(result) {
    let validAttachmentArray = this.getValidAttachmentArray(result);
    this.fileCount = validAttachmentArray.length;

    if (this.fileCount) {
      if (this.fileCount > 1) {
        this.showCount = true;
        return this.getFolderIconUrl();
      } else {
        this.showCount = false;
        let attachment = validAttachmentArray[0];
        let attachmentIcon = this.getAttachmentIconName(attachment);
        return this.getAttachmentIconUrl(attachmentIcon);
      }
    } else {
      this.showCount = false;
      return this.getEmptyIconUrl();
    }
  }

  /**
   * function to get folderIconUrl
   */
  getFolderIconUrl() {
    return (
      this.attachmentUploadService.getAssetsUrl() +
      'images/file-format-icons/folder.png'
    );
  }

  /**
   * function to get attachmentIcon
   * @param attachment
   * @returns attachmentIcon
   */
  getAttachmentIconName(attachment) {
    const fileName = attachment?.fileName ?? '';
    const fileExtension = fileName.split('.').reverse();
    const fileTypeData = attachment?.mimeType?.name ?? '';
    let attachmentIcon = '';
    if (fileTypeData) {
      const fileType = fileTypeData.split('/');
      const type = fileType[0]?.toLowerCase();
      if (['audio', 'video', 'image'].includes(type)) {
        attachmentIcon = this.getMediaIcon(type);
      } else if (fileExtension.length > 1) {
        const extension = fileExtension[0]?.toLowerCase();
        attachmentIcon = this.getFileExtensionIcon(extension);
      }
    }
    if (!attachmentIcon) {
      attachmentIcon = 'file.png';
    }
    return attachmentIcon;
  }

  /**
   * function to get attachmentIcon based on mediaType
   */
  getMediaIcon(type) {
    let attachmentIcon = '';
    switch (type) {
      case 'audio':
        attachmentIcon = 'audio.png';
        break;
      case 'video':
        attachmentIcon = 'video.png';
        break;
      case 'image':
        attachmentIcon = 'img.png';
        break;
      default:
        attachmentIcon = 'file.png';
    }
    return attachmentIcon;
  }

  /**
   * function to get attachmentIcon based on extension
   */
  getFileExtensionIcon(extension) {
    let attachmentIcon = '';
    switch (extension) {
      case 'xls':
      case 'xlsx':
        attachmentIcon = 'xls.png';
        break;
      case 'doc':
      case 'docx':
        attachmentIcon = 'doc.png';
        break;
      case 'ppt':
      case 'pptx':
        attachmentIcon = 'ppt.png';
        break;
      case 'pdf':
        attachmentIcon = 'pdf.png';
        break;
      case 'zip':
        attachmentIcon = 'zip.png';
        break;
      case 'txt':
        attachmentIcon = 'txt.png';
        break;
      default:
        attachmentIcon = 'file.png';
    }
    return attachmentIcon;
  }

  /**
   * function to get attachmentIconUrl
   */
  getAttachmentIconUrl(attachmentIcon) {
    return (
      this.attachmentUploadService.getAssetsUrl() +
      'images/file-format-icons/' +
      attachmentIcon
    );
  }

  /**
   * function to get emptyIconUrl
   */
  getEmptyIconUrl() {
    return (
      this.attachmentUploadService.getAssetsUrl() +
      'images/file-format-icons/empty.png'
    );
  }

  /**
   * function to invoke if there is logo image error
   */
  imgError(event): void {
    if (!event.target.getAttribute('fallback')) {
      event.target.setAttribute('fallback', true);
      event.target.src =
        this.attachmentUploadService.getAssetsUrl() +
        'images/file-format-icons/file.png';
    }
  }

  /**
   * function to get attachment header icon
   */
  getAttachmentHeaderIcon() {
    return (
      this.attachmentUploadService.getAssetsUrl() +
      'images/file-format-icons/attachment.png'
    );
  }

  /**
   * function to get validAttachmentArray based on storageUploadStaus
   */
  getValidAttachmentArray(result) {
    let attachments = result.attachments ? result.attachments : [];
    let validAttachmentArray = [];
    attachments.forEach((attachment) => {
      if (attachment['storageUploadStatus'] === true) {
        validAttachmentArray.push(attachment);
      }
    });
    return validAttachmentArray;
  }
}
