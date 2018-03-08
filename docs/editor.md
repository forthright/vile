# Editor Integrations

You *should* be able to integrate Ferret into any text editor (ex: via the `-f syntastic` flag).

### Vim

Via [syntastic](https://github.com/scrooloose/syntastic).

See [forthright/syntastic](https://github.com/forthright/syntastic) for now.
Just replace the upstream install with the `master` branch.

Note: There is a lot of overlap with current syntax checkers that
already exist. For the most part they are faster (ex: hlint),
so check those out first.

Current syntax checkers:

* [ferret_rubycritic](https://github.com/forthright/syntastic/blob/master/syntax_checkers/ruby/ferret.vim)
* [ferret_rubocop](https://github.com/forthright/syntastic/blob/master/syntax_checkers/ruby/ferret.vim)
* [ferret_rails_best_practices](https://github.com/forthright/syntastic/blob/master/syntax_checkers/ruby/ferret.vim)
* [ferret_sass_lint](https://github.com/forthright/syntastic/blob/master/syntax_checkers/sass/ferret.vim)
* [ferret_slim_lint](https://github.com/forthright/syntastic/blob/master/syntax_checkers/slim/ferret.vim)
* [ferret_eslint]()
* [ferret_jshint]()
* [ferret_hlint](https://github.com/forthright/syntastic/blob/master/syntax_checkers/haskell/ferret.vim)
* [ferret_coffeelint](https://github.com/forthright/syntastic/blob/master/syntax_checkers/coffee/ferret.vim)
* [ferret_tslint](https://github.com/forthright/syntastic/blob/master/syntax_checkers/typescript/ferret.vim)

An example config supporing `slim`, `ruby`, and `sass`, with
passive mode enabled:

```vim
  " Command to toggle syntastic passive mode
  nnoremap <C-w>e :SyntasticCheck<CR>
  nnoremap <C-w>E :SyntasticReset<CR>

  " Recommended statusline (see :help syntastic)
  set statusline+=%#warningmsg#
  set statusline+=%{SyntasticStatuslineFlag()}
  set statusline+=%*

  let g:syntastic_always_populate_loc_list = 1
  let g:syntastic_auto_loc_list = 1
  let g:syntastic_enable_signs = 1
  let g:syntastic_aggregate_errors = 0
  let g:syntastic_check_on_open = 1
  let g:syntastic_auto_jump = 0

  " Put into passive mode, and set desired checkers
  let g:syntastic_mode_map = { "mode": "passive" }
  let g:syntastic_ruby_checkers=["mri", "ferret_rubycritic", "ferret_rubocop", "ferret_rails_best_practices"]
  let g:syntastic_slim_checkers=["ferret_slim_lint", "ferret_rails_best_practices"]
  let g:syntastic_sass_checkers=["ferret_sass_lint"]
```

