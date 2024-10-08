// Core imports
import { Component, OnInit, ViewChild } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

// Third party imports
import { TranslateService } from '@ngx-translate/core';
import {
  BreadcrumbService,
  PortalMessageService,
} from '@onecx/portal-integration-angular';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Application imports
import { AttachmentUploadService } from '../attachment-upload.service';
import { DocumentCharacteristicsComponent } from '../document-create/document-characteristics/document-characteristics.component';
import { DocumentAttachmentComponent } from './document-attachment/document-attachment.component';
import {
  AttachmentCreateUpdateDTO,
  DocumentCreateUpdateDTO,
  DocumentControllerV1APIService,
} from 'src/app/generated';
import { noSpecialCharacters } from '../../../utils';

@Component({
  selector: 'app-document-create',
  templateUrl: './document-create.component.html',
  styleUrls: ['./document-create.component.scss'],
  providers: [ConfirmationService],
})
export class DocumentCreateComponent implements OnInit {
  @ViewChild(DocumentAttachmentComponent, { static: false })
  documentAttachmentComponent: DocumentAttachmentComponent;
  @ViewChild(DocumentCharacteristicsComponent, { static: false })
  documentCharacteristicsComponent: DocumentCharacteristicsComponent;

  indexActive: number;
  isSubmitting = false;
  cancelDialogVisible = false;
  documentDescriptionIsValid = false;

  documentCreateUpdateDTO: DocumentCreateUpdateDTO;
  documentCreateForm: UntypedFormGroup;
  menuItems: MenuItem[];
  attachmentArray: any = [];
  charactersticsArray: any = [];
  subscriptions: any;
  translatedData: any;
  documentVersion;

  constructor(
    private readonly translateService: TranslateService,
    private readonly breadcrumbService: BreadcrumbService,
    private readonly documentV1Service: DocumentControllerV1APIService,
    private readonly portalMessageService: PortalMessageService,
    private readonly attachmentUploadService: AttachmentUploadService,
    private readonly router: Router,
    private readonly activeRoute: ActivatedRoute,
    private readonly formBuilder: UntypedFormBuilder
  ) {}

  ngOnInit(): void {
    this.getTranslatedData();
    // Form Validations
    this.documentCreateForm = this.formBuilder.group({
      documentDescriptionForm: this.formBuilder.group({
        name: [
          '',
          [Validators.required, Validators.maxLength(60), noSpecialCharacters],
        ],
        typeId: ['', Validators.required],
        documentVersion: ['', Validators.min(0)],
        channelname: ['', Validators.required],
        specificationName: [''],
        lifeCycleState: ['DRAFT'],
        description: ['', Validators.maxLength(1000)],
        involvement: [null],
        reference_type: [null],
        reference_id: [null],
      }),
    });
    this.documentCreateForm.valueChanges.subscribe(() => {
      const formControls = this.documentCreateForm.controls;
      this.documentDescriptionIsValid =
        formControls.documentDescriptionForm.valid;
    });
    this.initSteps();
  }
  /**
   * function to get translatedData from translateService
   */
  getTranslatedData(): void {
    this.translateService
      .get([
        'DOCUMENT_MENU.DOCUMENT_CREATE.CREATE_SUCCESS',
        'DOCUMENT_MENU.DOCUMENT_CREATE.CREATE_ERROR',
        'DOCUMENT_MENU.DOCUMENT_CREATE.HEADER',
        'DOCUMENT_DETAIL.ATTACHMENTS.UPLOAD_SUCCESS',
        'DOCUMENT_DETAIL.ATTACHMENTS.UPLOAD_ERROR',
        'DOCUMENT_DETAIL.DOCUMENT_CANCEL_MODAL.CANCEL_CONFIRM_MESSAGE',
        'DOCUMENT_DETAIL.MULTIPLE_ATTACHMENTS.UPLOAD_SUCCESS',
        'DOCUMENT_DETAIL.MULTIPLE_ATTACHMENTS.UPLOAD_ERROR',
        'GENERAL.PROCESSING',
      ])
      .subscribe((data) => {
        this.translatedData = data;
        this.breadcrumbService.setItems([
          { label: data['DOCUMENT_MENU.DOCUMENT_CREATE.HEADER'] as string },
        ]);
        this.initSteps();
      });
  }
  /**
   * function to get the boolean value to enable or disable the next button
   */
  get canActivateNext(): boolean {
    switch (this.indexActive) {
      case 0:
        if (this.documentDescriptionIsValid) {
          return true;
        }
        return false;
      case 1:
        if (this.documentAttachmentComponent?.showAttachment) {
          return (
            this.documentAttachmentComponent.attachmentFieldsForm.valid &&
            !this.documentAttachmentComponent.showAttachment
          );
        } else {
          return true;
        }
      default:
        return true;
    }
  }
  /**
   * function to set button disable or enable according to active page index
   */
  submitForm(): void {
    this.isSubmitting = true;
    switch (this.indexActive) {
      case 0:
        this.indexActive = 1;
        this.isSubmitting = false;
        break;
      case 1:
        this.indexActive = 2;
        this.isSubmitting = false;
        break;
      default:
        this.onSubmit();
    }
  }
  /**
   * @returns set of attachment array that user has uploaded
   */
  private mapAttachments(): AttachmentCreateUpdateDTO[] {
    let setAttachments = [];
    let attachmentsArray = [];
    try {
      attachmentsArray = this.attachmentArray.map((element) => ({
        name: element.name,
        description: element.description,
        mimeTypeId: element.mimeTypeId,
        validFor: { startDateTime: null, endDateTime: element.validity },
        fileName: element.fileName,
      }));

      if (attachmentsArray.length !== 0) {
        setAttachments = attachmentsArray;
      } else {
        setAttachments = [
          {
            id: 0,
            name: 'attachment',
            description: null,
            type: null,
            mimeTypeId: 0,
            validFor: {
              startDateTime: null,
              endDateTime: null,
            },
          },
        ];
      }
      return setAttachments;
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * @returns set of files array that user has uploaded
   */
  private mapUploads() {
    let fileUploads = [];
    try {
      fileUploads = this.attachmentArray.map((element) => ({
        file: element.fileData,
      }));
      return fileUploads;
    } catch (err) {
      console.error(err);
    }
  }
  /**
   * function to submit user input data to create the new document
   */
  public onSubmit(): void {
    this.documentCreateUpdateDTO = {
      ...this.documentCreateForm.value.documentDescriptionForm,
      categories: [],
      characteristics: this.getCharacteristicsData(),
      documentRelationships: [],
      relatedParties: [],
      tags: [],
      channel: {
        id: null,
        name: this.documentCreateForm.value.documentDescriptionForm.channelname,
      },
      specification: {
        name: this.documentCreateForm.value.documentDescriptionForm
          .specificationName,
        specificationVersion: null,
      },
      relatedObject: {
        id: null,
        involvement:
          this.documentCreateForm.value.documentDescriptionForm.involvement,
        objectReferenceId:
          this.documentCreateForm.value.documentDescriptionForm.reference_id,
        objectReferenceType:
          this.documentCreateForm.value.documentDescriptionForm.reference_type,
      },
      attachments: this.mapAttachments(),
    };
    this.documentCreateUpdateDTO.documentVersion = this.documentVersion;
    this.callCreateDocumentApi(this.documentCreateUpdateDTO);
  }
  /**
   * function to pass data to the service API call to create new document
   * @param documentCreateUpdateDTO
   */
  callCreateDocumentApi(documentCreateUpdateDTO) {
    this.subscriptions = this.documentV1Service
      .createDocument({ documentCreateUpdateDTO: documentCreateUpdateDTO })
      .pipe(
        catchError((err) => {
          this.portalMessageService.error({
            summaryKey: 'DOCUMENT_MENU.DOCUMENT_CREATE.CREATE_ERROR',
          });
          this.router.navigate(['../../search'], {
            relativeTo: this.activeRoute,
          });
          return throwError(err);
        })
      )
      .subscribe((res) => {
        this.portalMessageService.success({
          summaryKey: 'DOCUMENT_MENU.DOCUMENT_CREATE.CREATE_SUCCESS',
        });
        if (this.mapUploads().length) {
          this.callUploadAttachmentsApi(res.id);
        }
        this.router.navigate(['../../search'], {
          relativeTo: this.activeRoute,
        });
      });
  }
  /**
   * function to pass the document id and files to be uploaded to the service API call
   * @param documentId
   */
  callUploadAttachmentsApi(documentId) {
    const fileUploads = this.mapUploads();
    let filesToBeUploaded = [];
    for (let fileUpload of fileUploads) {
      filesToBeUploaded.push(fileUpload.file);
    }
    this.attachmentUploadService
      .uploadAttachment(documentId, filesToBeUploaded)
      .subscribe((res) => {
        if (res.attachmentResponse) {
          let successFiles = 0;
          let failedFiles = 0;
          const resp = Object.values(res.attachmentResponse);
          resp.forEach((element) => {
            if (element === 201) {
              successFiles++;
            } else {
              failedFiles++;
            }
          });
          if (successFiles > 0) {
            this.portalMessageService.success({
              summaryParameters: { successFiles: successFiles },
              summaryKey: 'DOCUMENT_DETAIL.MULTIPLE_ATTACHMENTS.UPLOAD_SUCCESS',
            });
          }
          if (failedFiles > 0) {
            this.portalMessageService.error({
              summaryParameters: { failedFiles: failedFiles },
              summaryKey: 'DOCUMENT_DETAIL.MULTIPLE_ATTACHMENTS.UPLOAD_ERROR',
              life: 5000,
            });
            this.attachmentUploadService.exportAllFailedAttachments(documentId);
          }
        }
      });
  }
  /**
   *
   * @param array
   * @returns new copied array
   */
  private deepCopyArray(array: any[]): any[] {
    return Object.assign([], array);
  }
  /**
   * function to close the create new form flow on cancel button click
   * @param event
   */
  onCancel(event) {
    const isDocChanges = this.attachmentArray.length >= 1;
    const isCharChanges =
      this.documentCharacteristicsComponent?.genericFormArray?.value?.length >=
      1;
    let flagIsValid = false;

    let documentform = this.documentCreateForm.value.documentDescriptionForm;

    for (let detail in documentform) {
      if (detail != 'lifeCycleState' && documentform[detail]) {
        flagIsValid = true;
      }
    }

    if (flagIsValid || isDocChanges || isCharChanges) {
      this.cancelDialogVisible = true;
    } else {
      this.router.navigate(['../../search'], {
        relativeTo: this.activeRoute,
      });
    }
  }
  /* function for no option on cancel dialogue */
  onCancelNo() {
    this.cancelDialogVisible = false;
  }
  /* function for Yes option on cancel dialogue */
  onCancelYes() {
    this.router.navigate(['../../search'], {
      relativeTo: this.activeRoute,
    });
  }
  /**
   * function to set active page index
   */
  public initSteps(): void {
    this.indexActive = this.indexActive || 0;
    this.menuItems = [
      {
        command: (event: any) => {
          this.indexActive = 0;
        },
      },
      {
        command: (event: any) => {
          this.indexActive = 1;
        },
      },
      {
        command: (event: any) => {
          this.indexActive = 2;
        },
      },
    ];
  }
  /**
   * function to set active index on back button click
   */
  navigateBack(): void {
    if (this.indexActive > 0) this.indexActive--;
  }
  /**
   * function to set document characteristics data from generic form array
   * @returns characteristicsSet
   */
  getCharacteristicsData() {
    let documentCharacteristicsData = this.deepCopyArray(
      this.documentCharacteristicsComponent.genericFormArray.value
    ).filter((entry) => entry.name != '' || entry.value != '');

    let characteristicsSet = documentCharacteristicsData.filter(
      (value, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            t.name.toLowerCase() === value.name.toLowerCase() &&
            t.value.toLowerCase() === value.value.toLowerCase()
        )
    );
    return characteristicsSet;
  }

  /**
   *
   * @param value documentversion
   * which will update the global variable.
   */
  onUpdateDocumentVersion(value) {
    this.documentVersion = value;
  }
}
