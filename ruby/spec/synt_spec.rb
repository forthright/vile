require_relative './spec_helper'
require_relative './../lib/vile/cli'

describe Vile::CLI do
  subject { }

  context 'cli' do
    context 'comparing things' do
      context 'that are Files' do
        before do
          expect(IO).to receive(:read).and_return("42").twice
        end

        it 'read both files from the file system' do
          subject.compare compare: "file/path.rb", to: "file/path2"
        end
      end

      context 'that are Strings' do
        before do
          expect(IO).to_not receive(:read)
        end

        it 'should not read any files' do
          subject.compare compare: "file/path.rb",
                          to: "file/path2",
                          "string-compare" => true
        end
      end
    end
  end
end
