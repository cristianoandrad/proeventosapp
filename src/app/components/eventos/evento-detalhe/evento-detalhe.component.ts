import { Component, OnInit, TemplateRef } from '@angular/core';
import { FormGroup, FormControl, Validators, FormBuilder, FormArray, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Evento } from '@app/models/Evento';
import { Lote } from '@app/models/Lote';
import { EventoService } from '@app/services/evento.service';
import { LoteService } from '@app/services/lote.service';
import { environment } from '@environments/environment';
import { BsLocaleService } from 'ngx-bootstrap/datepicker';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-evento-detalhe',
  templateUrl: './evento-detalhe.component.html',
  styleUrls: ['./evento-detalhe.component.scss']
})
export class EventoDetalheComponent implements OnInit {

  modalRef: BsModalRef;
  evento = {} as Evento;
  form: FormGroup;
  estadoSalvar = 'post';
  eventoId: number;
  loteAtual = {id: 0, nome: '', indice: 0};
  imagemURL = 'assets/img/upload.png';
  file: File;

  get modoEditar(): boolean {
    return this.estadoSalvar === 'put';
  }

  get lotes(): FormArray {
    return this.form.get('lotes') as FormArray;
  }

  get f(): any {
    return this.form.controls;
  }

  get bsConfig(): any {
    return {
      isAnimated: true,
      adaptivePosition: true,
      dateInputFormat: 'DD/MM/YYYY hh:mm a',
      containerClass: 'theme-default',
      showWeekNumbers: false
    };
  }

  get bsConfigLote(): any {
    return {
      isAnimated: true,
      adaptivePosition: true,
      dateInputFormat: 'DD/MM/YYYY',
      containerClass: 'theme-default',
      showWeekNumbers: false
    };
  }

  constructor(
    private fb: FormBuilder,
    private localeService: BsLocaleService,
    private ActivatedRouter: ActivatedRoute,
    private enventoService: EventoService,
    private spinner: NgxSpinnerService,
    private toastr: ToastrService,
    private router: Router,
    private loteService: LoteService,
    private modalService: BsModalService,
    )
    {
      this.localeService.use('pt-br');
    }

  public carregarEvento(): void {
    this.eventoId = +this.ActivatedRouter.snapshot.paramMap.get('id');
    console.log('O estadoSalvar' + this.estadoSalvar);

    if (this.eventoId != null && this.eventoId != 0) {
      console.log("eventoId: " + this.eventoId);
      this.spinner.show();

      this.estadoSalvar = 'put';

      this.enventoService.getEventoById(this.eventoId).subscribe(
        (evento: Evento) => {
          this.evento = {...evento};
          this.form.patchValue(this.evento);
          // this.evento.lotes.forEach(lote => {
          //   this.lotes.push(this.criarLote(lote));
          // });

          if (this.evento.imagemURL != '') {
            this.imagemURL = environment.apiURL + 'resources/images/' + this.evento.imagemURL;
          }

          this.carregarLotes();
        },
        (error: any) => {
          this.spinner.hide();
          this.toastr.error('Erro ao tentar carrregar Evento', 'Erro!');
          console.error(error);
        }
      ).add(() => this.spinner.hide());
    }
  }

  public carregarLotes(): void {
    this.loteService.getLotesByEventoId(this.eventoId).subscribe(
      (lotesRetornor: Lote[]) => {
        lotesRetornor.forEach(lote => {
          this.lotes.push(this.criarLote(lote));
        });
      },
      (error: any) => {
        this.toastr.error('Erro ao tentar carregar lotes', 'Error');
        console.error(error);
      }
    ).add(() => this.spinner.hide());
  }

  ngOnInit() {
    this.carregarEvento();
    this.validation();
  }

  public validation(): void {
    this.form = this.fb.group({
      tema: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(50)]],
      local: ['', Validators.required],
      dataEvento: ['', Validators.required],
      qtdPessoas: ['', [Validators.required, Validators.max(120000)]],
      telefone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      imagemURL: [''],
      lotes: this.fb.array([])
    })
  }

  adicionarLote(): void {
    this.lotes.push(this.criarLote({id: 0} as Lote));
  }

  criarLote(lote: Lote): FormGroup {

    return this.fb.group({
      id: [lote.id],
      nome: [lote.nome, Validators.required],
      quantidade: [lote.quantidade, Validators.required],
      preco: [lote.preco, Validators.required],
      dataInicio: [lote.dataInicio],
      dataFim: [lote.dataFim]
    });
  }

  public mudarValorData(value: Date, indice: number, campo: string): void {
    this.lotes.value[indice][campo] = value;
  }

  public resetForm(): void {
    this.form.reset();
  }

  public cssValidator(campoForm: FormControl | AbstractControl): any {
    return {'is-invalid': campoForm.errors && campoForm.touched};
  }

  public salvarEvento(): void {
    // console.log("O estado é " + this.estadoSalvar);

    if (this.form.valid){
      this.spinner.show();

      this.evento = (this.estadoSalvar === 'post') ? {...this.form.value} : {id: this.evento.id, ...this.form.value};

      this.enventoService[this.estadoSalvar](this.evento).subscribe(
        (eventoRetorno: Evento) => {
          this.toastr.success('Evento salvo com sucesso!', 'Sucesso');
          this.router.navigate([`eventos/detalhe/${eventoRetorno.id}`]);
        },
        (error: any) => {
          console.error(error);
          this.spinner.hide();
          this.toastr.error('Error ao salvar evento', 'Erro');
        },
        () => this.spinner.hide()
      );
    }
  }

  public salvarLotes(): void {
    this.spinner.show();
    if(this.form.controls['lotes'].valid) {
      this.loteService.saveLote(this.eventoId, this.form.value.lotes)
        .subscribe(
          () => {
            this.toastr.success('Lotes salvos com Sucesso!', 'Sucesso!');
            //this.lotes.reset();
          },
          (error: any) => {
            this.toastr.error('Erro ao tentar salvar lotes.', 'Erro');
            console.error(error);
          },
          ).add(() => this.spinner.hide());
    }
  }

  public removerLote(template: TemplateRef<any>, indice: number): void {
    this.loteAtual.id = this.lotes.get(indice + '.id').value;
    this.loteAtual.nome = this.lotes.get(indice + '.nome').value;
    this.loteAtual.indice = indice;
    this.modalRef = this.modalService.show(template, {class: 'modal-sm'});
  }

  public confirmDeleteLote(): void {
    this.modalRef.hide();
    this.spinner.show();

    this.loteService.deleteLote(this.eventoId, this.loteAtual.id)
      .subscribe(
        () => {
          this.toastr.success('Lote deletado com sucesso', 'Sucesso');
          this.lotes.removeAt(this.loteAtual.indice);
        },
        (error: any) => {
          this.toastr.error(`Erro ao tentar deletaro lote ${this.loteAtual.id}`, 'Erro');
          console.error(error);
        }
      ).add(() => this.spinner.hide());

  }

  public declineDeleteLote(): void {
    this.modalRef.hide();
  }

  public retornaTituloLote(nome: string): string {
    return nome === null || nome === '' ? 'Nome do Lote' : nome;
  }

  onFileChange(ev: any): void {
    const reader = new FileReader();

    reader.onload = (event: any) => this.imagemURL = event.target.result;

    this.file = ev.target.files;

    reader.readAsDataURL(this.file[0]);

    this.uploadImagem();
  }

  uploadImagem(): void {
    this.spinner.show();
    this.enventoService.postUpload(this.eventoId, this.file).subscribe(
      () => {
        this.carregarEvento();
        this.toastr.success('Imagem atualizada com sucesso', 'Sucesso!');
      },
      (error: any) => {
        this.toastr.error('Erro ao fazer upload de imagem', 'Erro!');
        console.error(error);

      }
    ).add(() => this.spinner.hide());
  }
}
