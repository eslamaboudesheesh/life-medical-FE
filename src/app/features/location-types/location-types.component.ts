import {
  afterNextRender,
  AfterRenderRef,
  ChangeDetectionStrategy,
  Component, DestroyRef,
  inject,
  OnDestroy,
  signal, TemplateRef, viewChild
} from '@angular/core';
import {GenericTableComponent} from '../../shared/components/generic-table/generic-table.component';
import {HubFiltersComponent} from '../../shared/components/hub-filters/hub-filters.component';
import {GenericTableCacheService} from '../../shared/services';
import {ConfirmationService, MenuItem, MessageService} from 'primeng/api';
import {DialogService} from 'primeng/dynamicdialog';
import {HubFilters} from '../../shared/components/hub-filters/models/hub-filters.model';
import {
  BackendErrorResponse,
  LocationColumnType, LocationServiceBody, LocationServiceEvent, LocationServicePayload, LocationServiceResponse,
  LocationType,
  LocationTypeResponse,
  ToggleServiceEvent
} from './models/location-types.model';
import {ItemFilter, ModeType} from '../../shared';
import {COMMON_CONSTANTS, INITIAL_FILTER_PAYLOAD} from '../../shared/constants/common-constants';
import {
  catchError,
  debounceTime,
  distinctUntilChanged, EMPTY,
  mergeMap,
  Observable,
  Subject,
  tap
} from 'rxjs';
import {TextWithBgColorComponent} from '../../shared/components/text-with-bg-color/text-with-bg-color.component';
import {genericCasting} from '../../shared/helpers/helpers';
import {TitleWithIconComponent} from '../../shared/components/title-with-icon/title-with-icon.component';
import {
  ServiceAvailabilityComponent
} from '../../shared/components/service-availability/service-availability.component';
import {ComponentStateComponent} from '../../shared/components/component-state/component-state.component';
import {SkeletonLoaderComponent} from '../../shared/components/skeleton-loader/skeleton-loader.component';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {Button} from 'primeng/button';
import {
  CreateLocationTypeDialogComponent
} from '../../shared/dialogs/create-location-type-dialog/create-location-type-dialog.component';
import {MenuModule} from 'primeng/menu';
import {Ripple} from 'primeng/ripple';
import {MODE} from '../../shared/enums/shared.enum';
import { LocationTypeActionsService } from './services/location-type-actions.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import { LocationsService } from './services/locations.service';

@Component({
  selector: 'app-location-types',
  imports: [
    GenericTableComponent,
    HubFiltersComponent,
    TextWithBgColorComponent,
    TitleWithIconComponent,
    ServiceAvailabilityComponent,
    ComponentStateComponent,
    SkeletonLoaderComponent,
    Button,
    TranslatePipe,
    // Menu,
    MenuModule,
    Ripple
  ],
  providers: [DialogService],
  standalone: true,
  templateUrl: './location-types.component.html',
  styleUrl: './location-types.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocationTypesComponent implements OnDestroy {
  // INJECTIONS
  readonly genericTableCacheService: GenericTableCacheService = inject(GenericTableCacheService);
  protected readonly confirmationService: ConfirmationService = inject(ConfirmationService);
  readonly #locationsService: LocationsService = inject(LocationsService);
  readonly #locationTypeActionsService: LocationTypeActionsService = inject(LocationTypeActionsService);
  readonly #dialogService: DialogService = inject(DialogService);
  // readonly loadingDialogService = inject(LoadingDialogService);
  readonly #messageService: MessageService = inject(MessageService);
  readonly #translateService: TranslateService = inject(TranslateService);
  readonly #destroyRef: DestroyRef = inject(DestroyRef);

  // SIGNALS
  items = signal<LocationType[]>([]);
  locationTypesPayload = signal<ItemFilter>(INITIAL_FILTER_PAYLOAD);
  isApplyingFilter = signal(false);
  isEmptyState = signal(false);
  isErrorState = signal(false);
  isLoading = signal(true);

  // SUBJECTS
  private toggle$ = new Subject<LocationServiceEvent>();

  // VIEW CHILDREN
  serviceCustomColumn = viewChild<TemplateRef<{$implicit: LocationType}>>('serviceCustomColumn');
  codeCustomColumn = viewChild<TemplateRef<{$implicit: LocationType}>>('codeCustomColumn');
  categoryCustomColumn = viewChild<TemplateRef<{$implicit: LocationType}>>('categoryCustomColumn');
  nameCustomColumn = viewChild<TemplateRef<{$implicit: LocationType}>>('nameCustomColumn');
  locationTypeServicesCustomColumn = viewChild<TemplateRef<{$implicit: LocationType}>>('locationTypeServicesCustomColumn');
  locationTypeActionsColumn = viewChild<TemplateRef<{$implicit: LocationType}>>('locationTypeActionsColumn');


  protected readonly genericCasting = genericCasting<LocationType>;

  init: AfterRenderRef = afterNextRender(() => {
  
  });


  ngOnDestroy(): void {
    this.genericTableCacheService.resetCache();
  }




  createTableColumns(): LocationColumnType[] {
    return [
      {field: 'name', alias: 'typeName', template: this.nameCustomColumn()},
      {field: 'category', alias: 'classification', template: this.categoryCustomColumn()},
      {field: 'code', alias: 'typeCode', template: this.codeCustomColumn()},
      {field: 'services', alias: 'availableServices', template: this.serviceCustomColumn()},
      {field: 'availability', template: this.locationTypeServicesCustomColumn()},
      {field: '', template: this.locationTypeActionsColumn()},
    ]
  }

  onFilterValueChanges(filterValues: HubFilters): void {
    this.isApplyingFilter.set(!!filterValues.filter);
    this.updateFilterPayload({...filterValues, page: 0});
  }

  onPageChange(currentPage: number) {
    this.updateFilterPayload({page: currentPage} as ItemFilter);

  }



  updateLocationService(toggleServiceEvent: ToggleServiceEvent, locationType: LocationType) {
    this.toggle$.next({...toggleServiceEvent, id: locationType.id});
  }

  updateFilterPayload(newFilters: HubFilters | ItemFilter): void {
    this.locationTypesPayload.update((current) => ({...current, ...newFilters}));
    console.log(this.locationTypesPayload(), 'UPDATED PAYLOAD');
  }

  handleEmptyState(): void {
    this.isEmptyState.set(true);
    this.isErrorState.set(false);
    this.genericTableCacheService.totalAvailableItems.set(0);
  }

  handleErrorState(): void {
    this.isErrorState.set(true);
    this.isEmptyState.set(false);
    this.genericTableCacheService.totalAvailableItems.set(0);
  }

  clearStates(): void {
    this.isEmptyState.set(false);
    this.isErrorState.set(false);
  }

  openAddLocationTypeModal(mode: ModeType = MODE.ADD, locationTypeData?: LocationType): void {
    console.log(locationTypeData, 'INSIDE MAIN TABLE')
    const dialogRef = this.#dialogService.open(CreateLocationTypeDialogComponent, {
      header: this.#translateService.instant(mode === MODE.ADD ? 'createNewType' : 'editType'),
      width: '580px',
      modal: true,
      closable: true,
      data: {
        mode,
        ...(locationTypeData as LocationType && { locationTypeData})
      }
    });

    // dialogRef.onClose.pipe(
    //   tap((dialogCloseResponse: {refresh: boolean}) => {
    //     if (dialogCloseResponse?.refresh) {
    //       this.getLocationTypes();
    //     }
    //   }),
    //   takeUntilDestroyed(this.#destroyRef),
    // ).subscribe()
  }

  locationTypeActions(row: LocationType): MenuItem[] {
    return [
      {
        label: 'edit',
        command: () => {
          this.openAddLocationTypeModal(MODE.EDIT, row);
        },
        alias: 'edit'
      },
      {
        label: 'delete',
        command: () => {
          this.openDeleteConfirmDialog(row.id);
        },
        alias: 'delete',
        visible: !row['has-linked-locations']
      }
    ];
  }

  openDeleteConfirmDialog(locationTypeId: number): void {
    this.confirmationService.confirm({
      header: this.#translateService.instant('deleteLocationTypeConfirmMessageHeader'),
      message: this.#translateService.instant('deleteLocationTypeConfirmMessageBody'),
      closable: false,
      closeOnEscape: true,
      rejectButtonProps: {
        label: this.#translateService.instant('cancel'),
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: this.#translateService.instant('confirm'),
        severity: 'secondary',
      },
      acceptVisible: true,
      accept: (): void => {
       
      }
    });
  }





}
